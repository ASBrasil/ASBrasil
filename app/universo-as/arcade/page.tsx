import { db } from "@/lib/db";
import { getParticipantEmail } from "@/lib/participant-session";
import { getSessionAdminId } from "@/lib/auth";
import { ArcadeUniverse } from "@/components/arcade/ArcadeUniverse";
import { ARCADE_GAME_IDS, canViewArcadeGame } from "@/lib/arcade";

export const metadata = { title: "AS Game Universe" };
export const dynamic = "force-dynamic";

// Mesma regra de visibilidade dos outros jogos (ver Game.visibility em
// games/phases/[phaseId]/complete/route.ts): joga fora daqui, antes de
// renderizar, os cards que o visitante não pode ver - LIVE é sempre
// visível, DRAFT/TESTING só pra admin ou testador cadastrado.
export default async function ArcadePage() {
  const [email, adminId, settings] = await Promise.all([
    getParticipantEmail(),
    getSessionAdminId(),
    db.arcadeGameSetting.findMany(),
  ]);

  const isAdmin = Boolean(adminId);
  const isTester = email ? Boolean(await db.gameTester.findUnique({ where: { email } })) : false;
  const byId = new Map(settings.map((s) => [s.gameId, s.visibility]));

  const visibleGames = ARCADE_GAME_IDS.filter((id) =>
    canViewArcadeGame(byId.get(id) ?? "LIVE", isAdmin, isTester)
  );

  return <ArcadeUniverse visibleGames={visibleGames} />;
}
