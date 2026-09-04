import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ApprovalQueue } from "@/components/admin/ApprovalQueue";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { status?: string };
}) {
  const event = await db.event.findUnique({ where: { id: params.id } });
  if (!event) notFound();

  const fields = (event.signupFields as any[]) ?? [];
  const photoField = fields.find((f) => f.type === "photo");
  const needsApproval = event.requireSignupApproval || !!photoField?.required;

  const status = searchParams.status === "all" ? undefined : searchParams.status ?? "PENDING";

  const participants = await db.participant.findMany({
    // Mostra quem veio pela inscrição pública (SIGNUP) E quem veio de
    // missão/pré-requisito (MISSION - números extras liberados ao
    // completar uma missão que exige aprovação, ou o número base revelado
    // por uma missão de escolha). Import de planilha e cadastro manual
    // continuam de fora - nunca passam por essa exigência, então
    // aparecer aqui só confundiria (ficariam "Aprovado" e "Sem foto" por
    // padrão, o que parece um bug mas não é - só não fazem parte desse
    // fluxo).
    where: {
      eventId: event.id,
      source: { in: ["SIGNUP", "MISSION"] },
      ...(status ? { moderationStatus: status as any } : {}),
    },
    include: { mission: { select: { title: true } } },
    orderBy: { createdAt: "desc" },
  });

  // Missão obrigatória que NÃO gera número extra (ex: "conte sua
  // experiência") não cria nenhum Participant/ticket - a aprovação dela
  // vive só na própria MissionCompletion, então sem isso ela nunca
  // aparecia aqui mesmo com "Exigir aprovação" ligado na missão.
  const missionCompletions = await db.missionCompletion.findMany({
    where: {
      mission: { eventId: event.id, grantsExtraTicket: false, requiresApproval: true },
      ...(status ? { moderationStatus: status as any } : {}),
    },
    include: { mission: { select: { title: true } } },
    orderBy: { completedAt: "desc" },
  });
  const completionEmails = Array.from(new Set(missionCompletions.map((c) => c.email)));
  const baseParticipants = completionEmails.length
    ? await db.participant.findMany({
        where: { eventId: event.id, email: { in: completionEmails } },
        select: { email: true, name: true, phone: true, raffleNumber: true },
      })
    : [];
  const baseByEmail = new Map<
    string,
    { name: string; phone: string | null; raffleNumber: number }
  >(baseParticipants.map((p) => [p.email, p]));

  const allRows = [
    ...participants.map((p) => ({
      id: p.id,
      name: p.name,
      email: p.email,
      phone: p.phone,
      raffleNumber: p.raffleNumber,
      photoUrl: p.photoUrl,
      customData: p.customData as Record<string, string> | null,
      moderationStatus: p.moderationStatus,
      createdAt: p.createdAt.toISOString(),
      missionTitle: p.mission?.title ?? null,
      sortKey: p.createdAt.getTime(),
    })),
    ...missionCompletions.map((c) => {
      const base = baseByEmail.get(c.email);
      return {
        id: c.id,
        name: base?.name ?? c.email,
        email: c.email,
        phone: base?.phone ?? null,
        raffleNumber: base?.raffleNumber ?? 0,
        photoUrl: c.photoUrl,
        customData: null as Record<string, string> | null,
        moderationStatus: c.moderationStatus,
        createdAt: c.completedAt.toISOString(),
        missionTitle: c.mission.title,
        kind: "missionCompletion" as const,
        sortKey: c.completedAt.getTime(),
      };
    }),
  ].sort((a, b) => b.sortKey - a.sortKey);

  return (
    <div>
      <Link href={`/admin/events/${event.id}`} className="back">
        ← Voltar pro evento
      </Link>

      <div className="header">
        <h1>🔍 Aprovações — {event.name}</h1>
        <p className="subtitle">
          Revise o comprovante enviado por cada participante antes de confirmar o número dele para
          o sorteio.
        </p>
        <p className="filter-note">
          Mostra inscrições pelo formulário público, números liberados por missões que exigem
          aprovação e missões obrigatórias que exigem aprovação mesmo sem liberar número extra —
          importados de planilha e adicionados manualmente não passam por essa etapa, então não
          aparecem aqui.
        </p>
      </div>

      <div className={`diagnostic ${needsApproval ? "ok" : "warn"}`}>
        <strong>
          {needsApproval ? "✅" : "⚠️"} Novas inscrições ficam pendentes: {needsApproval ? "SIM" : "NÃO"}
        </strong>
        <span>
          {needsApproval
            ? "Toda inscrição nova nasce Pendente e precisa ser revisada aqui antes do número valer pro sorteio."
            : "Inscrições novas são aprovadas automaticamente, sem passar por revisão nenhuma."}
        </span>
        <strong className="second">
          {photoField ? "📸" : "—"} Print/comprovante: {photoField ? (photoField.required ? "obrigatório" : "opcional") : "não configurado neste evento"}
        </strong>
        <span className="detail-line">
          "Exigir aprovação manual": {event.requireSignupApproval ? "ligada" : "desligada"}
          {photoField?.required && !event.requireSignupApproval && " · fica pendente mesmo assim, porque o comprovante é obrigatório"}
        </span>
      </div>

      <div className="tabs">
        <Link href={`/admin/events/${event.id}/aprovacoes?status=PENDING`} className={`tab ${(status ?? "PENDING") === "PENDING" ? "active" : ""}`}>
          Pendentes
        </Link>
        <Link href={`/admin/events/${event.id}/aprovacoes?status=APPROVED`} className={`tab ${status === "APPROVED" ? "active" : ""}`}>
          Aprovados
        </Link>
        <Link href={`/admin/events/${event.id}/aprovacoes?status=REJECTED`} className={`tab ${status === "REJECTED" ? "active" : ""}`}>
          Recusados
        </Link>
        <Link href={`/admin/events/${event.id}/aprovacoes?status=all`} className={`tab ${status === undefined ? "active" : ""}`}>
          Todos
        </Link>
      </div>

      <ApprovalQueue participants={allRows} />

      <style>{`
        .back {
          color: var(--indigo-600);
          text-decoration: none;
          font-size: 0.85rem;
        }
        .header { margin: 1rem 0 1.5rem; max-width: 40rem; }
        h1 { margin: 0 0 0.4rem; font-family: var(--font-display, inherit); }
        .subtitle { color: var(--text-muted); font-size: 0.9rem; margin: 0 0 0.5rem; }
        .filter-note {
          color: var(--text-muted);
          font-size: 0.8rem;
          margin: 0;
          font-style: italic;
        }
        .diagnostic {
          display: flex;
          flex-direction: column;
          gap: 0.35rem;
          max-width: 40rem;
          padding: 0.9rem 1.1rem;
          border-radius: 0.6rem;
          margin-bottom: 1.5rem;
          font-size: 0.85rem;
        }
        .diagnostic.ok {
          background: rgba(22, 163, 74, 0.08);
          border: 1px solid rgba(22, 163, 74, 0.3);
        }
        .diagnostic.warn {
          background: rgba(180, 83, 9, 0.08);
          border: 1px solid rgba(180, 83, 9, 0.3);
        }
        .diagnostic span {
          color: var(--text-muted);
          line-height: 1.5;
        }
        .diagnostic .second {
          margin-top: 0.3rem;
          padding-top: 0.5rem;
          border-top: 1px solid var(--border);
        }
        .diagnostic .detail-line {
          font-size: 0.78rem;
          opacity: 0.75;
        }
        .tabs {
          display: flex;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
          border-bottom: 1px solid var(--border);
        }
        .tab {
          text-decoration: none;
          color: var(--text-muted);
          font-size: 0.85rem;
          font-weight: 600;
          padding: 0.6rem 0.9rem;
          border-bottom: 2px solid transparent;
        }
        .tab.active {
          color: var(--indigo-600);
          border-bottom-color: var(--indigo-600);
        }
      `}</style>
    </div>
  );
}
