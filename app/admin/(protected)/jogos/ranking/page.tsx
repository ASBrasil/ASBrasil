import { db } from "@/lib/db";
import { GamesSubNav } from "@/components/admin/GamesSubNav";
import { getScopedRanking, getRankingSummary } from "@/lib/ranking";

export const dynamic = "force-dynamic";

function parseDateInput(value: string | undefined, endOfDay = false): Date | undefined {
  if (!value) return undefined;
  const d = new Date(`${value}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export default async function AdminRankingPage({
  searchParams,
}: {
  searchParams: { eventId?: string; gameId?: string; since?: string; until?: string };
}) {
  const eventId = searchParams.eventId || undefined;
  const gameId = searchParams.gameId || undefined;
  const since = parseDateInput(searchParams.since);
  const until = parseDateInput(searchParams.until, true);

  const scope = gameId ? { gameId, since, until } : { eventId, since, until };

  const [events, games, ranking, summary] = await Promise.all([
    db.event.findMany({ select: { id: true, name: true }, orderBy: { startAt: "desc" } }),
    db.game.findMany({
      select: { id: true, name: true, eventId: true, event: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    }),
    getScopedRanking(scope, 100),
    getRankingSummary(scope),
  ]);

  const gamesForSelectedEvent = eventId ? games.filter((g) => g.eventId === eventId) : games;
  const activeGameId = gamesForSelectedEvent.some((g) => g.id === gameId) ? gameId : undefined;

  return (
    <div>
      <div className="header">
        <h1>🏆 Ranking — Universo AS</h1>
        <p className="subtitle">
          Soma de pontos (XP) de todas as fases de quiz jogadas, por pessoa. Mesmo cálculo usado no
          ranking que o participante vê em <code>/universo-as</code>, com filtros extras só pra
          análise interna.
        </p>
      </div>

      <GamesSubNav active="ranking" />

      <form method="GET" className="filters">
        <div className="field">
          <label htmlFor="eventId">Evento</label>
          <select id="eventId" name="eventId" defaultValue={eventId ?? ""}>
            <option value="">Todos os eventos</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="gameId">Jogo</label>
          <select id="gameId" name="gameId" defaultValue={activeGameId ?? ""}>
            <option value="">Todos os jogos{eventId ? " deste evento" : ""}</option>
            {gamesForSelectedEvent.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name} {!eventId && `— ${g.event.name}`}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="since">De</label>
          <input id="since" type="date" name="since" defaultValue={searchParams.since ?? ""} />
        </div>
        <div className="field">
          <label htmlFor="until">Até</label>
          <input id="until" type="date" name="until" defaultValue={searchParams.until ?? ""} />
        </div>
        <button type="submit" className="filter-btn">
          Filtrar
        </button>
        {(eventId || gameId || searchParams.since || searchParams.until) && (
          <a href="/admin/jogos/ranking" className="clear-link">
            Limpar filtros
          </a>
        )}
      </form>

      <div className="summary-grid">
        <div className="summary-card">
          <p className="summary-value">{summary.totalPlayers}</p>
          <p className="summary-label">Jogadores no ranking</p>
        </div>
        <div className="summary-card">
          <p className="summary-value">{summary.avgScore}</p>
          <p className="summary-label">Pontuação média (XP)</p>
        </div>
        <div className="summary-card">
          <p className="summary-value">{summary.topScore}</p>
          <p className="summary-label">Maior pontuação (XP)</p>
        </div>
        <div className="summary-card">
          <p className="summary-value">{summary.completedPhases}</p>
          <p className="summary-label">Fases com 100% concluídas</p>
        </div>
      </div>

      {ranking.length === 0 ? (
        <p className="empty">Nenhuma pontuação registrada com esses filtros ainda.</p>
      ) : (
        <table className="ranking-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Jogador</th>
              <th>XP</th>
            </tr>
          </thead>
          <tbody>
            {ranking.map((entry) => (
              <tr key={entry.email}>
                <td className="rank-cell">{entry.rank}º</td>
                <td>{entry.label}</td>
                <td className="xp-cell">{entry.xp}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <p className="hint">
        O filtro de período considera quando a pontuação foi registrada. Como esse campo é novo,
        pontuações feitas antes de {new Date("2026-09-09").toLocaleDateString("pt-BR")} aparecem
        com essa mesma data — filtrar por período antes disso não é confiável, só dali pra frente.
      </p>

      <style>{`
        .header { margin-bottom: 1rem; max-width: 42rem; }
        h1 { margin: 0 0 0.4rem; font-family: var(--font-display, inherit); }
        .subtitle { color: var(--text-muted); font-size: 0.9rem; margin: 0; line-height: 1.5; }
        code {
          background: var(--bg);
          padding: 0.1rem 0.4rem;
          border-radius: 0.3rem;
          font-size: 0.85rem;
        }
        .filters {
          display: flex;
          align-items: flex-end;
          gap: 1rem;
          flex-wrap: wrap;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 0.75rem;
          padding: 1rem 1.25rem;
          margin-bottom: 1.5rem;
        }
        .field {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
        }
        .field label {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--text-muted);
        }
        .field select,
        .field input {
          padding: 0.5rem 0.6rem;
          border-radius: 0.5rem;
          border: 1px solid var(--border);
          background: var(--bg);
          color: var(--text);
          font-size: 0.85rem;
          min-width: 11rem;
        }
        .filter-btn {
          background: var(--indigo-600);
          color: #fff;
          border: none;
          border-radius: 0.5rem;
          padding: 0.55rem 1.1rem;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
        }
        .clear-link {
          font-size: 0.8rem;
          color: var(--text-muted);
          text-decoration: underline;
        }
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(11rem, 1fr));
          gap: 1rem;
          margin-bottom: 1.75rem;
        }
        .summary-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 0.75rem;
          padding: 1rem 1.1rem;
          text-align: center;
        }
        .summary-value {
          margin: 0 0 0.2rem;
          font-size: 1.6rem;
          font-weight: 800;
          font-family: var(--font-display, inherit);
          color: var(--indigo-600);
        }
        .summary-label {
          margin: 0;
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .ranking-table {
          width: 100%;
          border-collapse: collapse;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 0.75rem;
          overflow: hidden;
        }
        .ranking-table th,
        .ranking-table td {
          text-align: left;
          padding: 0.65rem 1rem;
          font-size: 0.88rem;
          border-bottom: 1px solid var(--border);
        }
        .ranking-table th {
          color: var(--text-muted);
          font-size: 0.75rem;
          text-transform: uppercase;
          letter-spacing: 0.04em;
        }
        .ranking-table tbody tr:last-child td {
          border-bottom: none;
        }
        .rank-cell { font-weight: 700; width: 3rem; }
        .xp-cell { font-weight: 700; color: var(--indigo-600); }
        .empty { color: var(--text-muted); font-size: 0.9rem; }
        .hint {
          margin-top: 1rem;
          font-size: 0.78rem;
          color: var(--text-muted);
          max-width: 42rem;
        }
      `}</style>
    </div>
  );
}