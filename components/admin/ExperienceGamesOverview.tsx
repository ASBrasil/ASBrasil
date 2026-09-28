import Link from "next/link";
import { RankingList } from "@/components/participant/RankingList";
import type { RankingEntry } from "@/lib/ranking";

const VISIBILITY_LABEL: Record<string, string> = {
  DRAFT: "Rascunho",
  TESTING: "Teste",
  LIVE: "Ao vivo",
};
const VISIBILITY_TONE: Record<string, string> = {
  DRAFT: "tone-draft",
  TESTING: "tone-testing",
  LIVE: "tone-live",
};

interface GameRow {
  id: string;
  slug: string;
  name: string;
  visibility: string;
  eventName: string;
  phaseCount: number;
}

/**
 * Visão agregada de jogos + ranking dentro da página de uma Experiência.
 * Um Game pertence a um Event (sorteio), não à Experience diretamente -
 * essa lista agrupa todos os jogos dos sorteios vinculados a esta
 * experiência, exatamente como o Paulo pediu ("quero saber o ranking dos
 * joguinhos do universo AS" ao abrir a experiência), mesmo a Experience não
 * "possuindo" Game no schema.
 */
export function ExperienceGamesOverview({ games, ranking }: { games: GameRow[]; ranking: RankingEntry[] }) {
  return (
    <div className="card">
      <p className="section-title">Jogos e ranking desta experiência</p>
      <p className="hint-text">
        Jogos vinculados através dos sorteios acima (todo jogo pertence a um sorteio). O ranking
        soma o XP de todas as fases desses jogos — é a mesma visão que o participante vê em{" "}
        <code>/eventos/{"{slug}"}</code>.
      </p>

      {games.length === 0 ? (
        <p className="empty">
          Nenhum jogo ainda nos sorteios vinculados.{" "}
          <Link href="/admin/jogos" className="link">
            Criar um jogo →
          </Link>
        </p>
      ) : (
        <div className="games-list">
          {games.map((g) => (
            <Link key={g.id} href={`/admin/jogos/${g.id}`} className="game-row">
              <span className={`dot ${VISIBILITY_TONE[g.visibility] ?? ""}`} />
              <div className="game-info">
                <p className="game-name">{g.name}</p>
                <p className="game-meta">
                  {g.eventName} · {g.phaseCount} {g.phaseCount === 1 ? "fase" : "fases"}
                </p>
              </div>
              <span className={`badge ${VISIBILITY_TONE[g.visibility] ?? ""}`}>
                {VISIBILITY_LABEL[g.visibility] ?? g.visibility}
              </span>
            </Link>
          ))}
        </div>
      )}

      <div className="ranking-embed">
        <p className="ranking-title">Ranking (soma de XP)</p>
        <RankingList entries={ranking} emptyText="Ninguém pontuou nos jogos desta experiência ainda." />
      </div>

      <style jsx>{`
        .card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 0.75rem;
          padding: 1.1rem 1.25rem;
          margin-bottom: 1.75rem;
        }
        .section-title {
          font-size: 0.85rem;
          font-weight: 700;
          margin: 0 0 0.3rem;
        }
        .hint-text {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin: 0 0 1rem;
          line-height: 1.5;
        }
        code {
          background: var(--bg);
          padding: 0.05rem 0.35rem;
          border-radius: 0.3rem;
        }
        .link {
          color: var(--indigo-600);
          font-weight: 600;
        }
        .empty {
          color: var(--text-muted);
          font-size: 0.85rem;
          margin: 0 0 1rem;
        }
        .games-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          margin-bottom: 1.25rem;
        }
        .game-row {
          display: flex;
          align-items: center;
          gap: 0.7rem;
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 0.6rem;
          padding: 0.6rem 0.9rem;
          text-decoration: none;
          color: inherit;
        }
        .game-row:hover {
          border-color: var(--indigo-600);
        }
        .dot {
          width: 0.5rem;
          height: 0.5rem;
          border-radius: 999px;
          flex-shrink: 0;
          background: #9ca3af;
        }
        .dot.tone-live { background: #16a34a; }
        .dot.tone-testing { background: #d97706; }
        .dot.tone-draft { background: #9ca3af; }
        .game-info {
          flex: 1;
          min-width: 0;
        }
        .game-name {
          margin: 0 0 0.1rem;
          font-weight: 600;
          font-size: 0.88rem;
        }
        .game-meta {
          margin: 0;
          font-size: 0.76rem;
          color: var(--text-muted);
        }
        .badge {
          font-size: 0.7rem;
          font-weight: 700;
          padding: 0.2rem 0.55rem;
          border-radius: 999px;
          white-space: nowrap;
          background: #eef0f4;
          color: #667;
        }
        .badge.tone-live { background: rgba(22, 163, 74, 0.12); color: #16a34a; }
        .badge.tone-testing { background: rgba(217, 119, 6, 0.12); color: #d97706; }

        .ranking-embed {
          background: radial-gradient(ellipse 90% 60% at 50% -10%, #1b2a5c 0%, #0a1330 60%, #05070f 100%);
          border-radius: 0.65rem;
          padding: 1.1rem 1.1rem 1.25rem;
        }
        .ranking-title {
          margin: 0 0 0.75rem;
          font-size: 0.8rem;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.85);
        }
      `}</style>
    </div>
  );
}
