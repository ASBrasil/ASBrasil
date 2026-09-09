import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ExperienceThemeEditor } from "@/components/admin/ExperienceThemeEditor";
import { ExperienceEventsManager } from "@/components/admin/ExperienceEventsManager";

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

  const unassigned = await db.event.findMany({
    where: { experienceId: null, archived: false },
    orderBy: { name: "asc" },
    select: { id: true, name: true, slug: true, campaign: true, active: true },
  });

  return (
    <div>
      <Link href="/admin/experiencias" className="back">
        ← Voltar pras experiências
      </Link>

      <div className="header">
        <h1>{experience.name}</h1>
        <p className="subtitle">
          slug: <code>{experience.slug}</code> · {experience.events.length}{" "}
          {experience.events.length === 1 ? "sorteio vinculado" : "sorteios vinculados"}
        </p>
      </div>

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

      <style>{`
        .back {
          color: var(--indigo-600);
          text-decoration: none;
          font-size: 0.85rem;
        }
        .header { margin: 1rem 0 1.5rem; max-width: 42rem; }
        h1 { margin: 0 0 0.4rem; font-family: var(--font-display, inherit); }
        .subtitle { color: var(--text-muted); font-size: 0.9rem; margin: 0; }
        code {
          background: var(--bg);
          padding: 0.1rem 0.4rem;
          border-radius: 0.3rem;
          font-size: 0.85rem;
        }
      `}</style>
    </div>
  );
}
