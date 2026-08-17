import { db } from "@/lib/db";
import { NewClientForm } from "@/components/admin/NewClientForm";

export const dynamic = "force-dynamic";

export default async function NovoClientePage() {
  const events = await db.event.findMany({
    where: { archived: false },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    select: { id: true, name: true, campaign: true },
  });

  return (
    <div>
      <div className="header">
        <h1>Adicionar cliente</h1>
        <p className="subtitle">
          Cadastra a pessoa direto, sem precisar de planilha. Marca em quais eventos ela participa
          — se marcar mais de um, ela ganha um número novo em cada um.
        </p>
      </div>

      <NewClientForm events={events} />

      <style>{`
        .header { margin-bottom: 1.75rem; max-width: 36rem; }
        h1 { margin: 0 0 0.4rem; font-family: var(--font-display, inherit); }
        .subtitle { color: var(--text-muted); font-size: 0.9rem; margin: 0; }
      `}</style>
    </div>
  );
}
