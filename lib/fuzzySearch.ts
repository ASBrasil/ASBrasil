/**
 * Classic Levenshtein edit distance (insertions/deletions/substitutions)
 * between two strings, computed with a single rolling row instead of a full
 * matrix to keep memory flat regardless of string length.
 */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let prevRow = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i++) {
    const currRow = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      currRow[j] = Math.min(
        currRow[j - 1] + 1, // insertion
        prevRow[j] + 1, // deletion
        prevRow[j - 1] + cost // substitution
      );
    }
    prevRow = currRow;
  }

  return prevRow[b.length];
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // remove acentos (á -> a, etc.)
}

/**
 * True if `query` reasonably matches `target` - either as a direct
 * substring, or "close enough" (edit distance <= maxDistance) to some word
 * within `target`. The word-by-word check is what makes "joao" find
 * "João Pedro Silva" even though a whole-string edit distance between
 * "joao" and the full name would be huge - typos happen within a single
 * name or e-mail local-part, not smeared across the whole string.
 */
export function fuzzyMatch(query: string, target: string, maxDistance = 2): boolean {
  const q = normalize(query.trim());
  const t = normalize(target);
  if (!q) return true;
  if (t.includes(q)) return true;

  const words = t.split(/[\s@._-]+/).filter(Boolean);
  return words.some((word) => {
    // Só compara a distância entre palavras de tamanho parecido - evita
    // "casar" com qualquer palavra de 1-3 letras só porque a distância
    // numérica fica baixa por coincidência de tamanho.
    if (Math.abs(word.length - q.length) > maxDistance) return false;
    return levenshtein(q, word) <= maxDistance;
  });
}
