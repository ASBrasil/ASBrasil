import { redirect } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { getParticipantEmail } from "@/lib/participant-session";
import { ProfileForm } from "@/components/participant/ProfileForm";
import { ProfilePhotos } from "@/components/participant/ProfilePhotos";
import { CharacterAvatarPicker } from "@/components/participant/CharacterAvatarPicker";
import { ParticipantTopNav } from "@/components/participant/ParticipantTopNav";
import { IconAlertTriangle } from "@/components/participant/GameIcons";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, { label: string; color: string }> = {
  PENDING: { label: "Pendente de aprovação", color: "#ffd75a" },
  APPROVED: { label: "Aprovado", color: "#4ddcff" },
  REJECTED: { label: "Recusado", color: "#ff667d" },
};

export default async function PerfilPage() {
  const email = await getParticipantEmail();
  if (!email) redirect("/entrar");

  const [rows, universeProfile, ownedCharacters] = await Promise.all([
    db.participant.findMany({
      where: { email, event: { archived: false } },
      include: { event: { select: { id: true, slug: true, name: true, active: true } } },
      orderBy: { createdAt: "desc" },
    }),
    db.universeProfile.findUnique({ where: { email } }),
    db.playerCharacter.findMany({
      where: { email },
      include: { character: { select: { id: true, name: true, rarity: true, imageUrl: true } } },
      orderBy: { obtainedAt: "desc" },
    }),
  ]);

  const latest = rows[0];
  const profileIncomplete = !universeProfile?.displayName || !universeProfile?.avatarUrl;

  const byEvent = new Map<string, { name: string; slug: string; active: boolean; statuses: string[] }>();
  for (const row of rows) {
    const entry = byEvent.get(row.event.id);
    if (entry) {
      entry.statuses.push(row.moderationStatus);
    } else {
      byEvent.set(row.event.id, {
        name: row.event.name,
        slug: row.event.slug,
        active: row.event.active,
        statuses: [row.moderationStatus],
      });
    }
  }
  const events = [...byEvent.values()];

  return (
    <main className="as-shell page">
      <ParticipantTopNav />

      <section className="content">
        <div className="page-heading">
          <span className="as-eyebrow">Sua conta</span>
          <h1 className="as-title">Meu perfil</h1>
          <p className="as-subtitle">Edite seus dados e veja de quais campanhas você já participou.</p>
        </div>

        {profileIncomplete && (
          <div className="incomplete-banner">
            <IconAlertTriangle size={18} className="banner-icon" />
            Falta pouco: adicione uma foto de perfil e um apelido pra completar seu cadastro.
          </div>
        )}

        <div className="columns">
          <div className="as-card col">
            <h2>Dados pessoais</h2>
            <ProfilePhotos
              initialAvatarUrl={universeProfile?.avatarUrl ?? null}
              initialWinnerPhotoUrl={universeProfile?.winnerPhotoUrl ?? null}
            />
            <CharacterAvatarPicker
              characters={ownedCharacters.map(({ character }) => character)}
              initialAvatarCharacterId={universeProfile?.avatarCharacterId ?? null}
            />
            <ProfileForm
              initialName={latest?.name ?? ""}
              initialPhone={latest?.phone ?? null}
              initialDisplayName={universeProfile?.displayName ?? null}
            />
            <p className="email-note">E-mail: {email} (usado pra entrar, não pode ser alterado aqui)</p>
          </div>

          <div className="as-card col">
            <h2>Suas participações</h2>
            {events.length === 0 ? (
              <p className="empty">Nenhuma participação encontrada.</p>
            ) : (
              <ul className="events-list">
                {events.map((e) => (
                  <li key={e.slug}>
                    <Link href={`/e/${e.slug}/painel`} className="as-card event-link">
                      <span className="event-name">{e.name}</span>
                      {e.statuses.includes("PENDING") && (
                        <span className="status-tag" style={{ color: STATUS_LABEL.PENDING.color }}>
                          {STATUS_LABEL.PENDING.label}
                        </span>
                      )}
                      {!e.statuses.includes("PENDING") && e.statuses.includes("REJECTED") && (
                        <span className="status-tag" style={{ color: STATUS_LABEL.REJECTED.color }}>
                          {STATUS_LABEL.REJECTED.label}
                        </span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <style>{`
        /* AS Brasil UI V4 (29/09) - tela migrada pro kit novo (ver
           app/globals.css e claude/pendencias-sorteios.md). .page só cuida
           do layout; o fundo escuro vem de .as-shell, aplicado no <main>. */
        .page {
          min-height: 100vh;
        }
        .content { max-width: 56rem; margin: 0 auto; padding: 2.5rem 2rem 6rem; }
        .page-heading { max-width: 32rem; margin-bottom: 2rem; }
        .page-heading .as-title { margin-bottom: 0.6rem; }
        .incomplete-banner {
          max-width: 56rem;
          display: flex;
          align-items: center;
          gap: 0.6rem;
          background: rgba(255, 215, 90, 0.1);
          border: 1px solid rgba(255, 215, 90, 0.24);
          color: #ffe07b;
          border-radius: 14px;
          padding: 0.75rem 1.1rem;
          font-size: 0.85rem;
          margin-bottom: 2rem;
        }
        .banner-icon { flex-shrink: 0; color: var(--as-yellow, #e8b646); }
        .columns {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          align-items: start;
        }
        .col {
          padding: 1.5rem 1.5rem 1.75rem;
        }
        h2 {
          font-family: "Sora", system-ui, sans-serif;
          font-size: 1.15rem;
          margin: 0 0 1.25rem;
        }
        .email-note {
          font-size: 0.78rem;
          color: var(--as-muted, rgba(255, 255, 255, 0.5));
          margin-top: 1rem;
        }
        .empty { color: rgba(255, 255, 255, 0.6); font-size: 0.9rem; }
        .events-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }
        .event-link {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          text-decoration: none;
          color: inherit;
          padding: 0.85rem 1rem;
          transition: transform 0.18s ease, border-color 0.18s ease;
        }
        .event-link:hover {
          transform: translateY(-2px);
          border-color: rgba(77, 220, 255, 0.35);
        }
        .event-name { font-weight: 700; font-size: 0.92rem; }
        .status-tag {
          display: inline-flex;
          align-items: center;
          min-height: 24px;
          padding: 0 9px;
          border-radius: 99px;
          background: rgba(255, 255, 255, 0.08);
          font-size: 0.68rem;
          font-weight: 900;
          letter-spacing: 0.03em;
          text-transform: uppercase;
          white-space: nowrap;
        }
        @media (max-width: 700px) {
          .columns { grid-template-columns: 1fr; gap: 2.5rem; }
        }
      `}</style>
    </main>
  );
}