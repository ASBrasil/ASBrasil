"use client";

import { useState } from "react";

type Visibility = "DRAFT" | "TESTING" | "LIVE";
type ArcadeGameRow = { gameId: string; name: string; visibility: Visibility };

const VISIBILITY_LABEL: Record<Visibility, string> = {
  DRAFT: "Rascunho",
  TESTING: "Teste",
  LIVE: "Ao vivo",
};
const VIS_BADGE_CLASS: Record<Visibility, string> = {
  DRAFT: "",
  TESTING: "as-badge-warning",
  LIVE: "as-badge-success",
};

/**
 * Visibilidade dos 4 jogos do hub /universo-as/arcade (Game Universe) - o
 * mesmo DRAFT/Teste/Ao vivo que os jogos de sorteio já têm, ver
 * ArcadeGameSetting em prisma/schema.prisma. Em Rascunho ou Teste, só quem
 * está na lista de testadores abaixo (ou um admin) consegue ver e jogar em
 * /universo-as/arcade - todo mundo mais nem vê o card do jogo.
 */
export function ArcadeGamesManager({ games: initialGames }: { games: ArcadeGameRow[] }) {
  const [games, setGames] = useState(initialGames);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function updateVisibility(gameId: string, visibility: Visibility) {
    setError(null);
    setSavingId(gameId);
    const res = await fetch(`/api/admin/arcade-games/${gameId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visibility }),
    });
    setSavingId(null);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setError(b.error || "Não deu pra salvar.");
      return;
    }
    setGames((gs) => gs.map((g) => (g.gameId === gameId ? { ...g, visibility } : g)));
  }

  return (
    <div className="wrap">
      {error && <p className="error">{error}</p>}
      <div className="list">
        {games.map((g) => (
          <div key={g.gameId} className="row">
            <div className="info">
              <strong>{g.name}</strong>
              <span className={`as-badge ${VIS_BADGE_CLASS[g.visibility]}`}>{VISIBILITY_LABEL[g.visibility]}</span>
            </div>
            <select
              className="as-select"
              value={g.visibility}
              disabled={savingId === g.gameId}
              onChange={(e) => updateVisibility(g.gameId, e.target.value as Visibility)}
            >
              <option value="DRAFT">Rascunho</option>
              <option value="TESTING">Teste</option>
              <option value="LIVE">Ao vivo</option>
            </select>
          </div>
        ))}
      </div>
      <style jsx>{`
        .wrap { max-width: 32rem; margin-bottom: 1.5rem; }
        .error { color: #c0392b; font-size: 0.85rem; margin: 0 0 0.5rem; }
        .list { display: flex; flex-direction: column; gap: 0.5rem; }
        .row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 0.75rem;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 0.6rem;
          padding: 0.6rem 0.9rem;
        }
        .info { display: flex; flex-direction: column; gap: 0.3rem; }
        .info strong { font-size: 0.92rem; }
        select { min-width: 9rem; }
      `}</style>
    </div>
  );
}
