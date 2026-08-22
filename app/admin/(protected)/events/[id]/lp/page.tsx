import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { LpBlocksEditor } from "@/components/admin/LpBlocksEditor";

export const dynamic = "force-dynamic";

export default async function EventLpPage({ params }: { params: { id: string } }) {
  const event = await db.event.findUnique({
    where: { id: params.id },
    select: { id: true, name: true, slug: true, lpBlocks: true },
  });
  if (!event) notFound();

  return (
    <div>
      <Link href={`/admin/events/${event.id}`} className="back">
        ← Voltar pro evento
      </Link>

      <div className="header">
        <div>
          <h1>🎨 Editar LP — {event.name}</h1>
          <p className="subtitle">
            Monte a página pública do evento com blocos de conteúdo — texto, imagem, ou cards.
            Aparecem entre o topo e a lista de prêmios, na ordem que você definir aqui.
          </p>
        </div>
        <a href={`/e/${event.slug}`} target="_blank" rel="noopener noreferrer" className="preview-link">
          Ver página pública ↗
        </a>
      </div>

      <LpBlocksEditor eventId={event.id} initialBlocks={event.lpBlocks as any} />

      <style>{`
        .back { color: var(--indigo-600); text-decoration: none; font-size: 0.85rem; }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          margin: 1rem 0 2rem;
        }
        h1 { margin: 0 0 0.4rem; font-family: var(--font-display, inherit); }
        .subtitle { color: var(--text-muted); font-size: 0.9rem; margin: 0; max-width: 34rem; }
        .preview-link {
          color: var(--indigo-600);
          text-decoration: none;
          font-size: 0.85rem;
          font-weight: 600;
          white-space: nowrap;
          padding: 0.55rem 1rem;
          border: 1px solid var(--border);
          border-radius: 999px;
        }
      `}</style>
    </div>
  );
}
