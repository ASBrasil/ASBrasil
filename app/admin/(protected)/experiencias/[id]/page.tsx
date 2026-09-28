import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ExperienceThemeEditor } from "@/components/admin/ExperienceThemeEditor";
import { ExperienceEventsManager } from "@/components/admin/ExperienceEventsManager";
import { ExperienceGamesOverview } from "@/components/admin/ExperienceGamesOverview";
import { ExperienceCharactersManager } from "@/components/admin/ExperienceCharactersManager";
import { getExperienceRanking } from "@/lib/ranking";

export const dynamic = "force-dynamic";

export default async function ExperienceDetailPage({ params }: { params: { id: string } }) {
  const experience = await db.experience.findUnique({
    where: { id: params.id },
    include: {
      events: {
        orderBy: { order: "asc" },
        select: { id: true, name: true, slug: true, campaign: true, active: true },
      },
    },
  });
  if (!experience) notFound();

  // "Jogos desta experiência": um Game é sempre amarrado a um Event
  // (Game.eventId), não à Experience diretamente - então pra ter a visão
  // agregada que o Paulo pediu ("ranking dos joguinhos" ao abrir a
  // experiência) juntamos por event.experienceId, igual a página pública já
  // faz em app/eventos/[slug]/page.tsx.
  const [unassigned, games, ranking, characters] = await Promise.all([
    db.event.findMany({
      where: { experienceId: null, archived: false },
      orderBy: { name: "asc" },
      select: { id: true, name: true, slug: true, campaign: true, active: true },
    }),
    db.game.findMany({
      where: { event: { experienceId: experience.id } },
      include: { event: { select: { name: true } }, phases: { select: { id: true } } },
      orderBy: { createdAt: "desc" },
    }),
    getExperienceRanking(experience.id),
    db.character.findMany({
      where: { experienceId: experience.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div>
      <Link href="/admin/experiencias" className="back">
        ← Voltar pras experiências
      </Link>

      <div className="header">
        <div>
          <h1>{experience.name}</h1>
          <p className="subtitle">
            slug: <code>{experience.slug}</code> · {experience.events.length}{" "}
            {experience.events.length === 1 ? "sorteio vinculado" : "sorteios vinculados"} ·{" "}
            {games.length} {games.length === 1 ? "jogo" : "jogos"}
          </p>
        </div>
        <a href={`/eventos/${experience.slug}`} target="_blank" rel="noreferrer" className="public-link">
          Ver página pública
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path
              d="M7 17 17 7M9 7h8v8"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </a>
      </div>
      {!experience.active && (
        <p className="draft-note">
          Essa experiência ainda não está visível na home do participante — o link acima funciona
          como pré-visualização (só você, logado como admin, consegue abrir).
        </p>
      )}

      <ExperienceThemeEditor
        experienceId={experience.id}
        name={experience.name}
        subtitle={experience.subtitle}
        description={experience.description}
        active={experience.active}
        theme={experience.theme as any}
      />

      <ExperienceEventsManager
        experienceId={experience.id}
        linked={experience.events}
        unassigned={unassigned}
      />

      <ExperienceGamesOverview
        games={games.map((g) => ({
          id: g.id,
          slug: g.slug,
          name: g.name,
          visibility: g.visibility,
          eventName: g.event.name,
          phaseCount: g.phases.length,
        }))}
        ranking={ranking}
      />

      <ExperienceCharactersManager
        experienceId={experience.id}
        characters={characters.map((c) => ({
          id: c.id,
          name: c.name,
          rarity: c.rarity,
          imageUrl: c.imageUrl,
          description: c.description,
        }))}
      />

      <style>{`
        .back {
          color: var(--indigo-600);
          text-decoration: none;
          font-size: 0.85rem;
        }
        .header {
          margin: 1rem 0 0.4rem;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 1rem;
          flex-wrap: wrap;
        }
        h1 { margin: 0 0 0.4rem; font-family: var(--font-display, inherit); }
        .subtitle { color: var(--text-muted); font-size: 0.9rem; margin: 0; }
        code {
          background: var(--bg);
          padding: 0.1rem 0.4rem;
          border-radius: 0.3rem;
          font-size: 0.85rem;
        }
        .public-link {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--indigo-600);
          text-decoration: none;
          border: 1px solid var(--border);
          border-radius: 999px;
          padding: 0.5rem 1rem;
          white-space: nowrap;
        }
        .public-link:hover {
          background: var(--bg);
        }
        .draft-note {
          font-size: 0.8rem;
          color: var(--text-muted);
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 0.5rem;
          padding: 0.6rem 0.9rem;
          margin: 0 0 1.5rem;
          max-width: 42rem;
        }
      `}</style>
    </div>
  );
}
