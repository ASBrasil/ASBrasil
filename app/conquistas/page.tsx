import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getParticipantEmail } from "@/lib/participant-session";
import { ParticipantTopNav } from "@/components/participant/ParticipantTopNav";
import { IconTrophy, IconLock, IconCardBack } from "@/components/participant/GameIcons";

export const dynamic = "force-dynamic";

// Cada nível pede 200 XP a mais que o anterior - fórmula simples, só pra dar
// uma sensação de progresso; não tem efeito nenhum além de visual.
const XP_PER_LEVEL = 200;

export default async function ConquistasPage() {
  const email = await getParticipantEmail();
  if (!email) redirect("/entrar");

  const [progress, allCards, ownedCards, wins] = await Promise.all([
    db.playerPhaseProgress.findMany({
      where: { email },
      include: { phase: { select: { points: true } } },
    }),
    db.gameCard.findMany({ select: { id: true } }),
    db.playerCard.findMany({
      where: { email },
      include: { card: { select: { id: true, name: true, rarity: true, imageUrl: true } } },
      orderBy: { obtainedAt: "desc" },
    }),
    db.drawResult.count({
      where: { voided: false, participant: { email } },
    }),
  ]);

  const xp = progress.reduce((sum, p) => sum + p.firstScore, 0);
  const level = 1 + Math.floor(xp / XP_PER_LEVEL);
  const xpIntoLevel = xp % XP_PER_LEVEL;
  const xpProgressPct = Math.round((xpIntoLevel / XP_PER_LEVEL) * 100);

  const perfectPhases = progress.filter((p) => p.firstScore >= p.phase.points && p.phase.points > 0).length;
  const totalCards = allCards.length;
  const ownedCount = ownedCards.length;

  const badges = [
    {
      id: "primeiro-jogo",
      name: "Primeiro jogo",
      description: "Jogou pela primeira vez no Universo AS.",
      earned: progress.length >= 1,
    },
    {
      id: "perfeccionista",
      name: "Perfeccionista",
      description: "Fechou uma fase com 100% de aproveitamento.",
      earned: perfectPhases >= 1,
    },
    {
      id: "colecionador",
      name: "Colecionador",
      description: "Já tem 5 ou mais cards no álbum.",
      earned: ownedCount >= 5,
    },
    {
      id: "album-completo",
      name: "Álbum completo",
      description: "Coletou todos os cards disponíveis.",
      earned: totalCards > 0 && ownedCount === totalCards,
    },
    {
      id: "sortudo",
      name: "Sortudo",
      description: "Já ganhou pelo menos um prêmio num sorteio.",
      earned: wins >= 1,
    },
  ];
  const earnedCount = badges.filter((b) => b.earned).length;

  return (
    <main className="as-shell page">
      <ParticipantTopNav />

      <section className="as-container content">
        <div className="page-heading">
          <span className="as-eyebrow">Seu progresso</span>
          <h1 className="as-title">Conquistas</h1>
          <p className="as-subtitle">
            Tudo o que você já alcançou jogando no Universo AS - some pontos jogando qualquer jogo
            de qualquer evento.
          </p>
        </div>

        <div className="as-kpi-grid stat-grid">
          <div className="as-card as-kpi stat-tile">
            <span className="as-kpi-label">Nível</span>
            <div className="as-kpi-value">{level}</div>
            <div className="as-progress xp-bar">
              <span style={{ width: `${xpProgressPct}%` }} />
            </div>
            <span className="stat-hint">
              {xpIntoLevel} / {XP_PER_LEVEL} XP pro nível {level + 1}
            </span>
          </div>
          <div className="as-card as-kpi">
            <span className="as-kpi-label">XP total</span>
            <div className="as-kpi-value">{xp}</div>
            <span className="stat-hint">Soma da primeira tentativa em cada fase</span>
          </div>
          <div className="as-card as-kpi">
            <span className="as-kpi-label">Álbum</span>
            <div className="as-kpi-value">
              {ownedCount}/{totalCards}
            </div>
            <span className="stat-hint">Cards colecionados</span>
          </div>
          <div className="as-card as-kpi">
            <span className="as-kpi-label">Conquistas</span>
            <div className="as-kpi-value">
              {earnedCount}/{badges.length}
            </div>
            <span className="stat-hint">Selos desbloqueados</span>
          </div>
        </div>

        <h2 className="section-spaced">Selos</h2>
        <div className="badges-grid">
          {badges.map((b) => (
            <div key={b.id} className={`as-card as-card-hover badge-card ${b.earned ? "earned" : "locked"}`}>
              <span className="badge-icon">
                {b.earned ? <IconTrophy size={22} /> : <IconLock size={20} />}
              </span>
              <p className="badge-name">{b.name}</p>
              <p className="badge-desc">{b.description}</p>
            </div>
          ))}
        </div>

        <h2 className="section-spaced">Meu álbum de figurinhas</h2>
        {ownedCards.length === 0 ? (
          <p className="empty">Nenhum card colecionado ainda - jogue no Universo AS pra ganhar o primeiro.</p>
        ) : (
          <div className="album-grid">
            {ownedCards.map(({ card }) => (
              <div key={card.id} className="as-card album-card">
                {card.imageUrl ? (
                  <img src={card.imageUrl} alt={card.name} className="album-thumb" />
                ) : (
                  <div className="album-thumb placeholder">
                    <IconCardBack size={26} />
                  </div>
                )}
                <p className="album-name">{card.name}</p>
                <p className="album-rarity">{card.rarity}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <style>{`
        .content { padding: 3rem 0 6rem; }
        .page-heading { max-width: 34rem; margin-bottom: 2.5rem; }
        h2 {
          font-family: var(--font-display);
          font-size: 1.15rem;
          margin: 0 0 1.25rem;
          color: var(--as-text);
        }
        .section-spaced { margin-top: 3rem; }
        .empty { color: var(--as-muted); font-size: 0.9rem; }
        .stat-tile { gap: 0.5rem; }
        .stat-hint {
          font-size: 0.74rem;
          color: var(--as-muted);
        }
        .xp-bar { margin: 0.2rem 0 0.1rem; }
        .badges-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(13rem, 1fr));
          gap: 1rem;
        }
        .badge-card {
          padding: 1.1rem 1.25rem;
        }
        .badge-card.earned {
          border-color: var(--as-card-hover-border);
          box-shadow: 0 0.5rem 1.4rem rgba(79, 95, 255, 0.12);
        }
        .badge-card.locked { opacity: 0.55; }
        .badge-icon {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 2.6rem;
          height: 2.6rem;
          border-radius: 999px;
          background: var(--as-badge-bg);
          color: var(--as-muted);
        }
        .badge-card.earned .badge-icon {
          background: linear-gradient(135deg, var(--as-cyan), var(--as-violet));
          color: #fff;
        }
        .badge-name { margin: 0.6rem 0 0.25rem; font-weight: 700; font-size: 0.95rem; color: var(--as-text); }
        .badge-desc { margin: 0; font-size: 0.78rem; color: var(--as-muted); line-height: 1.4; }
        .album-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(7rem, 1fr));
          gap: 1rem;
        }
        .album-card { text-align: center; padding: 0.6rem; }
        .album-thumb {
          width: 100%;
          aspect-ratio: 1 / 1;
          object-fit: cover;
          border-radius: 0.7rem;
          margin-bottom: 0.4rem;
        }
        .album-thumb.placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.6rem;
          background: var(--as-badge-bg);
          border-radius: 0.7rem;
        }
        .album-name { margin: 0; font-size: 0.78rem; font-weight: 600; color: var(--as-text); }
        .album-rarity { margin: 0.1rem 0 0; font-size: 0.7rem; color: var(--as-muted); text-transform: capitalize; }
      `}</style>
    </main>
  );
}
