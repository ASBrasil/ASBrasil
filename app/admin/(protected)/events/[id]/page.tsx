import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { PrizeDrawPanel } from "@/components/PrizeDrawPanel";
import { EventActionsBar } from "@/components/EventActionsBar";
import { PrizeEditPanel } from "@/components/admin/PrizeEditPanel";
import { PrizeReorderButtons } from "@/components/admin/PrizeReorderButtons";
import { PrizeDuplicateButton } from "@/components/admin/PrizeDuplicateButton";
import { PrizeCreatePanel } from "@/components/admin/PrizeCreatePanel";
import { ApprovalQueue } from "@/components/admin/ApprovalQueue";
import { startOfTodayBrasilia } from "@/lib/timezone";

export const dynamic = "force-dynamic";

const ONLINE_WINDOW_MS = 90 * 1000; // condizente com o intervalo de ping do PresenceHeartbeat (25s)
const RECENT_WINDOW_MS = 30 * 60 * 1000;

const MISSION_TYPE_ICON: Record<string, string> = {
  SELF_CHECK: "✅",
  QUIZ: "❓",
  PHOTO_UPLOAD: "📸",
  LINK_VISIT: "🔗",
};

export default async function EventDashboardPage({ params }: { params: { id: string } }) {
  const event = await db.event.findUnique({
    where: { id: params.id },
    include: {
      prizes: {
        orderBy: { order: "asc" },
        include: { losePopup: true, _count: { select: { notifyRequests: true } } },
      },
      _count: { select: { participants: true } },
    },
  });
  if (!event) notFound();

  const now = new Date();
  const hasMissions = event.missionMode === "MISSIONS";

  const [
    onlineCount,
    activeRecentGroups,
    visitedTotalGroups,
    visitedTodayCount,
    signupPending,
    missionPending,
    missions,
    ticketsByMission,
    eventParticipants,
  ] = await Promise.all([
    db.presence.count({
      where: { eventId: event.id, lastSeenAt: { gte: new Date(now.getTime() - ONLINE_WINDOW_MS) } },
    }),
    db.loginEvent.groupBy({
      by: ["email"],
      where: { eventId: event.id, createdAt: { gte: new Date(now.getTime() - RECENT_WINDOW_MS) } },
    }),
    db.loginEvent.groupBy({ by: ["email"], where: { eventId: event.id } }),
    db.loginEvent.count({ where: { eventId: event.id, createdAt: { gte: startOfTodayBrasilia() } } }),
    db.participant.findMany({
      where: { eventId: event.id, source: "SIGNUP", moderationStatus: "PENDING" },
      orderBy: { createdAt: "desc" },
    }),
    hasMissions
      ? db.participant.findMany({
          where: { eventId: event.id, source: "MISSION", moderationStatus: "PENDING" },
          include: { mission: { select: { title: true } } },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    hasMissions
      ? db.mission.findMany({
          where: { eventId: event.id },
          orderBy: { order: "asc" },
          include: { completions: true },
        })
      : Promise.resolve([]),
    hasMissions
      ? db.participant.findMany({
          where: { eventId: event.id, missionId: { not: null } },
          select: { email: true, missionId: true, moderationStatus: true },
        })
      : Promise.resolve([]),
    hasMissions
      ? db.participant.findMany({
          where: { eventId: event.id },
          select: { email: true, name: true },
          distinct: ["email"],
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const activeRecentCount = activeRecentGroups.length;
  const visitedTotalCount = visitedTotalGroups.length;

  // "Cadastro" só usa SIGNUP (o que já tinha em /aprovacoes); "Missões"
  // pega os tickets liberados por missão. Duas filas separadas, iguais em
  // formato ao componente que já existe na página de Aprovações - dá pra
  // agir direto daqui, sem precisar abrir aquele link.
  const signupPendingRows = signupPending.map((p) => ({
    id: p.id,
    name: p.name,
    email: p.email,
    phone: p.phone,
    raffleNumber: p.raffleNumber,
    photoUrl: p.photoUrl,
    customData: p.customData as Record<string, string> | null,
    moderationStatus: p.moderationStatus,
    createdAt: p.createdAt.toISOString(),
    missionTitle: null as string | null,
  }));
  const missionPendingRows = missionPending.map((p) => ({
    id: p.id,
    name: p.name,
    email: p.email,
    phone: p.phone,
    raffleNumber: p.raffleNumber,
    photoUrl: p.photoUrl,
    customData: p.customData as Record<string, string> | null,
    moderationStatus: p.moderationStatus,
    createdAt: p.createdAt.toISOString(),
    missionTitle: p.mission?.title ?? null,
  }));

  // Mapa "missionId:email" -> status do ticket que essa missão gerou,
  // pra colorir a matriz de missões (completou e está pendente / completou
  // e já foi aprovado). Missão sem ticket associado (ex: SELF_CHECK sem
  // grantsExtraTicket) simplesmente não entra nesse mapa - fica só "✓".
  const ticketStatusByKey = new Map<string, string>();
  for (const t of ticketsByMission) {
    if (t.missionId) ticketStatusByKey.set(`${t.missionId}:${t.email}`, t.moderationStatus);
  }

  const maxCompletions = Math.max(1, ...missions.map((m) => m.completions.length));

  const drawnCount = event.prizes.filter((p) => p.status === "DRAWN").length;

  return (
    <div>
      <div className="header">
        <div>
          <span className="eyebrow">{event.campaign ?? "Evento"}</span>
          <h1>{event.name}</h1>
        </div>
        <div className="header-actions">
          <a href={`/e/${event.slug}`} target="_blank" className="public-link">
            Ver página pública ↗
          </a>
          <EventActionsBar
            eventId={event.id}
            archived={event.archived}
            showApprovals={event.publicSignupEnabled}
          />
        </div>
      </div>

      <div className="stats-row">
        <a href={`/admin/events/${event.id}/participants`} className="stat stat-link">
          <strong>{event._count.participants}</strong>
          <span>Participantes →</span>
        </a>
        <div className="stat">
          <strong>{event.prizes.length}</strong>
          <span>Prêmios cadastrados</span>
        </div>
        <div className="stat">
          <strong>{drawnCount}</strong>
          <span>Sorteios realizados</span>
        </div>
        <div className="stat">
          <strong>{event.prizes.length - drawnCount}</strong>
          <span>Sorteios pendentes</span>
        </div>
      </div>

      <div className="stats-row access-row">
        <div className="stat stat-live">
          <strong>
            <span className="live-dot" aria-hidden />
            {onlineCount}
          </strong>
          <span>Online agora</span>
        </div>
        <div className="stat">
          <strong>{activeRecentCount}</strong>
          <span>Ativos (30 min)</span>
        </div>
        <div className="stat">
          <strong>{visitedTotalCount}</strong>
          <span>Visitaram (total)</span>
        </div>
        <div className="stat">
          <strong>{visitedTodayCount}</strong>
          <span>Acessos hoje</span>
        </div>
      </div>

      <h2>Prêmios</h2>
      <p className="hint">A ordem aqui é a mesma que o participante vê em "Seus sorteios".</p>

      {event.prizes.length > 0 && (
        <div className="prize-chart">
          <div className="prize-chart-track">
            {drawnCount > 0 && (
              <div
                className="prize-chart-seg done"
                style={{ width: `${(drawnCount / event.prizes.length) * 100}%` }}
              />
            )}
            {event.prizes.length - drawnCount > 0 && (
              <div
                className="prize-chart-seg pending"
                style={{ width: `${((event.prizes.length - drawnCount) / event.prizes.length) * 100}%` }}
              />
            )}
          </div>
          <div className="prize-chart-legend">
            <span><i className="dot done" /> {drawnCount} realizado{drawnCount !== 1 ? "s" : ""}</span>
            <span><i className="dot pending" /> {event.prizes.length - drawnCount} pendente{event.prizes.length - drawnCount !== 1 ? "s" : ""}</span>
          </div>
        </div>
      )}

      <PrizeCreatePanel eventId={event.id} />

      <div className="prizes">
        {event.prizes.map((prize, i) => {
          const revealed = !prize.surprise || (prize.unlockAt !== null && prize.unlockAt.getTime() <= Date.now());
          return (
          <div key={prize.id} className="prize-row">
            <PrizeReorderButtons
              prizeId={prize.id}
              isFirst={i === 0}
              isLast={i === event.prizes.length - 1}
            />
            <div className="prize-main">
              {prize.imageUrl ? (
                <img src={prize.imageUrl} alt="" className="prize-thumb" />
              ) : (
                <span className="prize-thumb placeholder">🎁</span>
              )}
              <div>
                <strong>
                  {prize.name}
                  {prize.surprise && (
                    <span className={`surprise-tag ${revealed ? "revealed" : ""}`}>
                      {revealed ? "🎁 surpresa revelada" : "🎁 surpresa"}
                    </span>
                  )}
                </strong>
                {prize.description && <p>{prize.description}</p>}
                {prize.scheduledAt && (
                  <p className="scheduled">
                    🗓️{" "}
                    {prize.scheduledAt.toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                      timeZone: "America/Sao_Paulo",
                    })}
                    {prize.autoDraw && <span className="auto-tag"> · 🤖 Automático</span>}
                  </p>
                )}
                {prize.surprise && !revealed && (
                  <p className="scheduled">
                    🔒 Revela em{" "}
                    {prize.unlockAt
                      ? prize.unlockAt.toLocaleString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "America/Sao_Paulo",
                        })
                      : "data a definir"}
                  </p>
                )}
                {prize.surprise && (
                  <p className="scheduled">
                    <a href={`/api/admin/prizes/${prize.id}/notify-export`} className="notify-export-link">
                      📧 Exportar interessados ({prize._count.notifyRequests})
                    </a>
                  </p>
                )}
                <div className="prize-actions">
                  <PrizeEditPanel
                    prize={{
                      id: prize.id,
                      name: prize.name,
                      description: prize.description,
                      imageUrl: prize.imageUrl,
                      scheduledAt: prize.scheduledAt ? prize.scheduledAt.toISOString() : null,
                      autoDraw: prize.autoDraw,
                      winMessage: prize.winMessage,
                      loseMessage: prize.loseMessage,
                      couponCode: prize.couponCode,
                      surprise: prize.surprise,
                      unlockAt: prize.unlockAt ? prize.unlockAt.toISOString() : null,
                      losePopup: prize.losePopup
                        ? {
                            active: prize.losePopup.active,
                            type: prize.losePopup.type,
                            title: prize.losePopup.title,
                            body: prize.losePopup.body,
                            imageUrl: prize.losePopup.imageUrl,
                            linkUrl: prize.losePopup.linkUrl,
                          }
                        : null,
                    }}
                  />
                  <PrizeDuplicateButton prizeId={prize.id} />
                </div>
              </div>
            </div>
            <PrizeDrawPanel prize={{ id: prize.id, name: prize.name, status: prize.status }} />
          </div>
          );
        })}
      </div>

      <h2>Aprovações</h2>
      <p className="hint">
        Revise direto por aqui, sem precisar abrir a página de Aprovações — o botão lá em cima
        continua disponível pra ver o histórico completo (aprovados/recusados).
      </p>
      <div className={`approvals-grid ${hasMissions ? "two-col" : ""}`}>
        <div className="approval-panel">
          <h3>📝 Cadastro {signupPendingRows.length > 0 && <span className="count-badge">{signupPendingRows.length}</span>}</h3>
          <ApprovalQueue participants={signupPendingRows} collapsible pageSize={20} />
        </div>
        {hasMissions && (
          <div className="approval-panel">
            <h3>🎯 Missões {missionPendingRows.length > 0 && <span className="count-badge">{missionPendingRows.length}</span>}</h3>
            <ApprovalQueue participants={missionPendingRows} collapsible pageSize={20} />
          </div>
        )}
      </div>

      {hasMissions && missions.length > 0 && (
        <>
          <h2>Missões</h2>
          <p className="hint">Quantas pessoas completaram cada missão, e quem completou qual.</p>

          <div className="mission-bars">
            {missions.map((m) => {
              const pct = Math.round((m.completions.length / maxCompletions) * 100);
              const pendingCount = eventParticipants.filter(
                (ep) => ticketStatusByKey.get(`${m.id}:${ep.email}`) === "PENDING"
              ).length;
              return (
                <div key={m.id} className="mission-bar-row">
                  <div className="mission-bar-label">
                    <span>
                      {MISSION_TYPE_ICON[m.type] ?? "•"} {m.title}
                    </span>
                    <span className="mission-bar-count">
                      {m.completions.length} de {eventParticipants.length}
                      {pendingCount > 0 && <span className="pending-note"> · {pendingCount} pendente{pendingCount > 1 ? "s" : ""}</span>}
                    </span>
                  </div>
                  <div className="mission-bar-track">
                    <div className="mission-bar-fill" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mission-matrix-wrap">
            <table className="mission-matrix">
              <thead>
                <tr>
                  <th className="matrix-name-col">Participante</th>
                  {missions.map((m) => (
                    <th key={m.id} title={m.title}>
                      {MISSION_TYPE_ICON[m.type] ?? "•"}
                      <span className="matrix-mission-title">{m.title}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {eventParticipants.map((ep) => (
                  <tr key={ep.email}>
                    <td className="matrix-name-col">
                      <strong>{ep.name}</strong>
                      <span className="matrix-email">{ep.email}</span>
                    </td>
                    {missions.map((m) => {
                      const completed = m.completions.some((c) => c.email === ep.email);
                      const ticketStatus = ticketStatusByKey.get(`${m.id}:${ep.email}`);
                      let cell = "—";
                      let cellClass = "matrix-cell-empty";
                      if (completed) {
                        if (ticketStatus === "PENDING") {
                          cell = "🕒";
                          cellClass = "matrix-cell-pending";
                        } else if (ticketStatus === "REJECTED") {
                          cell = "❌";
                          cellClass = "matrix-cell-rejected";
                        } else {
                          cell = "✓";
                          cellClass = "matrix-cell-done";
                        }
                      }
                      return (
                        <td key={m.id} className={cellClass}>
                          {cell}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <style>{`
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 2rem;
        }
        .eyebrow {
          text-transform: uppercase;
          letter-spacing: 0.1em;
          font-size: 0.7rem;
          color: var(--indigo-600);
        }
        h1 { margin: 0.2rem 0 0; font-family: var(--font-display, inherit); }
        .header-actions {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 0.75rem;
        }
        .public-link {
          color: var(--indigo-600);
          text-decoration: none;
          font-size: 0.85rem;
          font-weight: 600;
        }
        .stats-row {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
          margin-bottom: 2.5rem;
        }
        .stat {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 0.75rem;
          padding: 1.25rem;
        }
        .stat strong {
          display: block;
          font-size: 1.6rem;
        }
        .stat span {
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .stat-link {
          text-decoration: none;
          color: inherit;
          display: block;
        }
        .stat-link:hover {
          border-color: var(--indigo-600);
        }
        h2 { font-family: var(--font-display, inherit); margin-bottom: 0.35rem; }
        .hint {
          font-size: 0.82rem;
          color: var(--text-muted);
          margin: 0 0 1rem;
        }

        .access-row { margin-bottom: 2.5rem; }
        .stat-live strong {
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }
        .live-dot {
          width: 0.55rem;
          height: 0.55rem;
          border-radius: 50%;
          background: #16a34a;
          box-shadow: 0 0 0 rgba(22, 163, 74, 0.5);
          animation: live-pulse 2s infinite;
        }
        @keyframes live-pulse {
          0% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.45); }
          70% { box-shadow: 0 0 0 0.4rem rgba(22, 163, 74, 0); }
          100% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0); }
        }

        .approvals-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
          margin-bottom: 2.5rem;
        }
        .approvals-grid.two-col {
          grid-template-columns: repeat(2, 1fr);
        }
        .approval-panel h3 {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-family: var(--font-display, inherit);
          font-size: 1rem;
          margin: 0 0 0.9rem;
        }
        .count-badge {
          background: rgba(180, 83, 9, 0.12);
          color: #b45309;
          border-radius: 999px;
          font-size: 0.72rem;
          font-weight: 700;
          padding: 0.1rem 0.55rem;
        }

        .mission-bars {
          display: flex;
          flex-direction: column;
          gap: 0.9rem;
          margin-bottom: 2rem;
          max-width: 44rem;
        }
        .mission-bar-label {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          gap: 0.75rem;
          font-size: 0.85rem;
          margin-bottom: 0.3rem;
        }
        .mission-bar-count {
          color: var(--text-muted);
          font-size: 0.78rem;
          white-space: nowrap;
        }
        .pending-note { color: #b45309; font-weight: 600; }
        .mission-bar-track {
          height: 0.5rem;
          border-radius: 999px;
          background: var(--bg);
          border: 1px solid var(--border);
          overflow: hidden;
        }
        .mission-bar-fill {
          height: 100%;
          background: var(--indigo-600);
          border-radius: 999px;
        }

        .mission-matrix-wrap {
          overflow-x: auto;
          margin-bottom: 2.5rem;
          border: 1px solid var(--border);
          border-radius: 0.75rem;
        }
        .mission-matrix {
          border-collapse: collapse;
          width: 100%;
          font-size: 0.82rem;
        }
        .mission-matrix th,
        .mission-matrix td {
          padding: 0.55rem 0.75rem;
          border-bottom: 1px solid var(--border);
          text-align: center;
          white-space: nowrap;
        }
        .mission-matrix thead th {
          background: var(--surface);
          font-weight: 700;
          position: sticky;
          top: 0;
        }
        .matrix-mission-title {
          display: block;
          font-weight: 500;
          font-size: 0.68rem;
          color: var(--text-muted);
          max-width: 7rem;
          white-space: normal;
          margin-top: 0.15rem;
        }
        .matrix-name-col {
          text-align: left !important;
          position: sticky;
          left: 0;
          background: var(--bg);
        }
        .mission-matrix thead .matrix-name-col { background: var(--surface); }
        .matrix-name-col strong { display: block; font-size: 0.85rem; }
        .matrix-email { display: block; font-size: 0.72rem; color: var(--text-muted); }
        .matrix-cell-done { color: #16a34a; font-weight: 700; }
        .matrix-cell-pending { color: #b45309; font-weight: 700; }
        .matrix-cell-rejected { color: #c0392b; font-weight: 700; }
        .matrix-cell-empty { color: var(--text-muted); opacity: 0.4; }
        .prizes {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .prize-row {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 0.75rem;
          padding: 1.25rem 1.5rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1.25rem;
          flex-wrap: wrap;
        }
        .prize-main {
          display: flex;
          gap: 1rem;
          flex: 1;
          min-width: 16rem;
        }
        .prize-thumb {
          width: 3.5rem;
          height: 3.5rem;
          border-radius: 0.6rem;
          object-fit: cover;
          flex-shrink: 0;
        }
        .prize-thumb.placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg);
          font-size: 1.3rem;
        }
        .prize-row p {
          margin: 0.2rem 0 0;
          font-size: 0.85rem;
          color: var(--text-muted);
        }
        .prize-row p.scheduled {
          font-size: 0.78rem;
          margin-top: 0.35rem;
        }
        .auto-tag {
          color: var(--indigo-600);
          font-weight: 600;
        }
        .prize-actions {
          display: flex;
          flex-wrap: wrap;
          align-items: flex-start;
          gap: 0.5rem;
          margin-top: 0.6rem;
        }
        .prize-chart {
          max-width: 32rem;
          margin-bottom: 1.5rem;
        }
        .prize-chart-track {
          display: flex;
          height: 0.65rem;
          border-radius: 999px;
          overflow: hidden;
          background: var(--bg);
          border: 1px solid var(--border);
          margin-bottom: 0.6rem;
        }
        .prize-chart-seg.done { background: var(--indigo-600); }
        .prize-chart-seg.pending { background: rgba(180, 83, 9, 0.4); }
        .prize-chart-legend {
          display: flex;
          gap: 1.25rem;
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .prize-chart-legend .dot {
          display: inline-block;
          width: 0.55rem;
          height: 0.55rem;
          border-radius: 50%;
          margin-right: 0.35rem;
        }
        .prize-chart-legend .dot.done { background: var(--indigo-600); }
        .prize-chart-legend .dot.pending { background: rgba(180, 83, 9, 0.7); }
        .surprise-tag {
          display: inline-block;
          margin-left: 0.5rem;
          font-size: 0.68rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          padding: 0.15rem 0.55rem;
          border-radius: 999px;
          background: rgba(232, 182, 70, 0.15);
          color: #b45309;
          vertical-align: middle;
        }
        .surprise-tag.revealed {
          background: rgba(22, 163, 74, 0.12);
          color: #16a34a;
        }
        .notify-export-link {
          color: var(--indigo-600);
          font-weight: 600;
          text-decoration: none;
        }
        .notify-export-link:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
