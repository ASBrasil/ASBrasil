import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ImportHistoryClient } from "@/components/admin/ImportHistoryClient";

export const dynamic = "force-dynamic";

export default async function ImportHistoryPage({ params }: { params: { id: string } }) {
  const event = await db.event.findUnique({ where: { id: params.id }, select: { id: true, name: true } });
  if (!event) notFound();

  return (
    <div>
      <div className="header">
        <Link href={`/admin/events/${event.id}/participants`} className="back">
          ← {event.name}
        </Link>
        <h1>Histórico de importações</h1>
        <p className="subtitle">
          Cada planilha enviada aparece aqui, com quantas linhas foram aceitas e por que as demais
          foram rejeitadas.
        </p>
      </div>

      <ImportHistoryClient eventId={event.id} />

      <style>{`
        .header { margin-bottom: 1.5rem; }
        .back {
          color: var(--indigo-600);
          text-decoration: none;
          font-size: 0.85rem;
        }
        h1 { margin: 0.3rem 0 0.3rem; font-family: var(--font-display, inherit); }
        .subtitle { color: var(--text-muted); font-size: 0.9rem; margin: 0; }
      `}</style>
    </div>
  );
}
