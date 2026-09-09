import { db } from "@/lib/db";
import { ExperienceManager } from "@/components/admin/ExperienceManager";

export const dynamic = "force-dynamic";

export default async function ExperienciasPage() {
  const experiences = await db.experience.findMany({
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    include: { _count: { select: { events: true } } },
  });

  return (
    <div>
      <div className="header">
        <h1>Experiências</h1>
        <p className="subtitle">
          Uma Experiência agrupa vários sorteios que fazem parte do mesmo evento — por exemplo,
          os 3 sorteios de Oreo do BTS podem virar uma única experiência "BTS". Cada sorteio
          continua tendo sua própria página, prêmios e cadastro, exatamente como hoje; agrupar
          aqui só organiza como os participantes veem tudo isso junto, com um banner e um Universo
          AS próprios da experiência.
        </p>
      </div>

      <ExperienceManager
        experiences={experiences.map((e) => ({
          id: e.id,
          slug: e.slug,
          name: e.name,
          subtitle: e.subtitle,
          active: e.active,
          eventCount: e._count.events,
          theme: e.theme as { primaryColor?: string; secondaryColor?: string } | null,
        }))}
      />

      <style>{`
        .header { margin-bottom: 1.25rem; max-width: 42rem; }
        h1 { margin: 0 0 0.4rem; font-family: var(--font-display, inherit); }
        .subtitle { color: var(--text-muted); font-size: 0.9rem; margin: 0; line-height: 1.5; }
      `}</style>
    </div>
  );
}
