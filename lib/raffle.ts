import { randomBytes, createHmac, randomInt } from "node:crypto";

/**
 * Generates `count` unique raffle numbers in [min, max], returned shuffled.
 * We pick the smallest digit-width range that comfortably fits `count`
 * (aiming for a fill factor under ~60%) so numbers still look like a real
 * lottery draw ("8472") instead of a dense sequential counter, while keeping
 * collision-free assignment cheap for imports of 10k+ rows.
 *
 * This does NOT hit the database - callers assign the pool to participants
 * in one batch, then rely on the (eventId, raffleNumber) unique constraint
 * as a final safety net.
 */
export function generateNumberPool(count: number): number[] {
  const digits = Math.max(4, Math.ceil(Math.log10(count / 0.6)));
  const min = 10 ** (digits - 1);
  const max = 10 ** digits - 1;
  const rangeSize = max - min + 1;

  if (count > rangeSize) {
    throw new Error(
      `Cannot allocate ${count} unique numbers in range ${min}-${max}`
    );
  }

  // Reservoir-style partial Fisher-Yates: only touch `count` positions of a
  // conceptual [min..max] array, using a sparse swap map instead of
  // materializing the full range (matters once ranges get into the millions).
  const swapMap = new Map<number, number>();
  const result: number[] = [];

  for (let i = 0; i < count; i++) {
    const remaining = rangeSize - i;
    const pick = randomInt(0, remaining); // 0..remaining-1, cryptographically strong
    const actual = swapMap.get(pick) ?? pick;
    const last = remaining - 1;
    swapMap.set(pick, swapMap.get(last) ?? last);
    swapMap.delete(last);
    result.push(min + actual);
  }

  return result;
}

export interface EligibleParticipant {
  id: string;
  raffleNumber: number;
}

export interface DrawOutcome {
  winner: EligibleParticipant;
  rngSeed: string;
  eligibleCount: number;
}

/**
 * Selects a winner from the eligible pool in a way that can be independently
 * re-verified later: given the same `rngSeed` and the same eligible list
 * (sorted by raffleNumber, which is why numbers must never be reassigned),
 * anyone can recompute HMAC-SHA256(seed, index) and confirm the same
 * participant would be selected. The seed itself comes from crypto.randomBytes,
 * so the outcome cannot be predicted or steered ahead of time.
 */
export function drawWinner(pool: EligibleParticipant[]): DrawOutcome {
  if (pool.length === 0) {
    throw new Error("No eligible participants to draw from");
  }

  const sorted = [...pool].sort((a, b) => a.raffleNumber - b.raffleNumber);
  const rngSeed = randomBytes(16).toString("hex");

  const digest = createHmac("sha256", rngSeed).update(String(sorted.length)).digest();
  // Use the first 6 bytes as a big uint to avoid modulo bias at this scale.
  const asInt = digest.readUIntBE(0, 6);
  const index = asInt % sorted.length;

  return { winner: sorted[index], rngSeed, eligibleCount: sorted.length };
}

/** Recomputes the outcome for auditing - should equal the stored winner. */
export function verifyDraw(pool: EligibleParticipant[], rngSeed: string) {
  const sorted = [...pool].sort((a, b) => a.raffleNumber - b.raffleNumber);
  const digest = createHmac("sha256", rngSeed).update(String(sorted.length)).digest();
  const index = digest.readUIntBE(0, 6) % sorted.length;
  return sorted[index];
}
