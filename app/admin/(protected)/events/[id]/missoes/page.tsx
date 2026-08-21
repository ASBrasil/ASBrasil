import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { MissionManager } from "@/components/admin/MissionManager";

export const dynamic = "force-dynamic";

export default async function EventMissionsPage({ params }: { params: { id: string } }) {
  const event = await db.event.findUnique({
    where: { id: params.id },
    include: { missions: { orderBy: { order: "asc" } } },
  });
  if (!event) notFound();

  return (
    <div>
      <Link href={`/admin/events/${event.id}/edit`} className="back">
        ← Voltar pra edição do evento
      </Link>

      <div className="header">
        <h1>🎯 Missões — {event.name}</h1>
        <p className="subtitle">
          Pré-requisitos que a pessoa precisa cumprir antes de ver seus números e resultados
          neste evento. Missões marcadas como obrigatórias bloqueiam o acesso; as opcionais só
          ficam visíveis.
        </p>
        {event.missionMode !== "MISSIONS" && (
          <p className="warning">
            ⚠️ Esse evento está marcado como "Simples" — as missões abaixo não vão bloquear
            ninguém até você mudar para "Com missões" na edição do evento.
          </p>
        )}
      </div>

      <MissionManager eventId={event.id} initialMissions={event.missions as any} />

      <style>{`
        .back {
          color: var(--indigo-600);
          text-decoration: none;
          font-size: 0.85rem;
        }
        .header { margin: 1rem 0 2rem; max-width: 40rem; }
        h1 { margin: 0 0 0.4rem; font-family: var(--font-display, inherit); }
        .subtitle { color: var(--text-muted); font-size: 0.9rem; margin: 0; }
        .warning {
          margin-top: 0.75rem;
          font-size: 0.85rem;
          color: #b45309;
          background: rgba(180, 83, 9, 0.08);
          border: 1px solid rgba(180, 83, 9, 0.25);
          border-radius: 0.5rem;
          padding: 0.6rem 0.9rem;
        }
      `}</style>
    </div>
  );
}
