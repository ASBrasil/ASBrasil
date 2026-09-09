import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getParticipantEmail } from "@/lib/participant-session";
import { ParticipantTopNav } from "@/components/participant/ParticipantTopNav";

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
    <main className="page">
      <ParticipantTopNav />

      <section className="content">
        <div className="page-heading">
          <span className="eyebrow">Seu progresso</span>
          <h1>Conquistas</h1>
          <p className="subtitle">
            Tudo o que você já alcançou jogando no Universo AS - some pontos jogando qualquer jogo
            de qualquer evento.
          </p>
        </div>

        <div className="stat-grid">
          <div className="stat-tile">
            <span className="stat-label">Nível</span>
            <span className="stat-value">{level}</span>
            <div className="xp-bar">
              <div className="xp-fill" style={{ width: `${xpProgressPct}%` }} />
            </div>
            <span className="stat-hint">
              {xpIntoLevel} / {XP_PER_LEVEL} XP pro nível {level + 1}
            </span>
          </div>
          <div className="stat-tile">
            <span className="stat-label">XP total</span>
            <span className="stat-value">{xp}</span>
            <span className="stat-hint">Soma da primeira tentativa em cada fase</span>
          </div>
          <div className="stat-tile">
            <span className="stat-label">Álbum</span>
            <span className="stat-value">
              {ownedCount}/{totalCards}
            </span>
            <span className="stat-hint">Cards colecionados</span>
          </div>
          <div className="stat-tile">
            <span className="stat-label">Conquistas</span>
            <span className="stat-value">
              {earnedCount}/{badges.length}
            </span>
            <span className="stat-hint">Selos desbloqueados</span>
          </div>
        </div>

        <h2 className="section-spaced">Selos</h2>
        <div className="badges-grid">
          {badges.map((b) => (
            <div key={b.id} className={`badge-card ${b.earned ? "earned" : "locked"}`}>
              <span className="badge-icon">{b.earned ? "🏅" : "🔒"}</span>
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
              <div key={card.id} className="album-card">
                {card.imageUrl ? (
                  <img src={card.imageUrl} alt={card.name} className="album-thumb" />
                ) : (
                  <div className="album-thumb placeholder">🎴</div>
                )}
                <p className="album-name">{card.name}</p>
                <p className="album-rarity">{card.rarity}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <style>{`
        .page {
          min-height: 100vh;
          background: radial-gradient(ellipse 80% 50% at 50% -10%, #1b2a5c 0%, #0a1330 55%, #05070f 100%);
          font-family: system-ui, sans-serif;
          color: #f5f6fa;
        }
        .content { max-width: 64rem; margin: 0 auto; padding: 3rem 2rem 6rem; }
        .page-heading { max-width: 34rem; margin-bottom: 2.5rem; }
        .eyebrow {
          display: block;
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.14em;
          color: #8b9aff;
          margin-bottom: 0.6rem;
        }
        h1 { margin: 0 0 0.6rem; font-family: "Sora", system-ui, sans-serif; font-size: clamp(1.8rem, 3.5vw, 2.4rem); }
        .subtitle { color: rgba(255, 255, 255, 0.6); margin: 0; line-height: 1.6; }
        h2 {
          font-family: "Sora", system-ui, sans-serif;
          font-size: 1.15rem;
          margin: 0 0 1.25rem;
        }
        .section-spaced { margin-top: 3rem; }
        .empty { color: rgba(255, 255, 255, 0.6); font-size: 0.9rem; }
        .stat-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
          gap: 1rem;
        }
        .stat-tile {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 1rem;
          padding: 1.1rem 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
        }
        .stat-label {
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.06em;
          color: rgba(255, 255, 255, 0.55);
        }
        .stat-value {
          font-family: "Sora", system-ui, sans-serif;
          font-size: 1.8rem;
          font-weight: 700;
        }
        .stat-hint {
          font-size: 0.74rem;
          color: rgba(255, 255, 255, 0.5);
        }
        .xp-bar {
          height: 0.4rem;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.1);
          overflow: hidden;
          margin: 0.2rem 0 0.1rem;
        }
        .xp-fill {
          height: 100%;
          background: linear-gradient(90deg, #4f5fff, #8b9aff);
          border-radius: 999px;
        }
        .badges-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(13rem, 1fr));
          gap: 1rem;
        }
        .badge-card {
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 1rem;
          padding: 1.1rem 1.25rem;
        }
        .badge-card.locked { opacity: 0.5; }
        .badge-icon { font-size: 1.6rem; }
        .badge-name { margin: 0.5rem 0 0.25rem; font-weight: 700; font-size: 0.95rem; }
        .badge-desc { margin: 0; font-size: 0.78rem; color: rgba(255, 255, 255, 0.6); line-height: 1.4; }
        .album-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(7rem, 1fr));
          gap: 1rem;
        }
        .album-card { text-align: center; }
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
          background: rgba(255, 255, 255, 0.05);
        }
        .album-name { margin: 0; font-size: 0.78rem; font-weight: 600; }
        .album-rarity { margin: 0.1rem 0 0; font-size: 0.7rem; color: rgba(255, 255, 255, 0.5); text-transform: capitalize; }
      `}</style>
    </main>
  );
}
