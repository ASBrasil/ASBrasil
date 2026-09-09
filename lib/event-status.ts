// Estado de um sorteio/experiência pro participante, usado nos badges
// (🟢 Ativa / 🟡 Encerrada / 🔵 Em breve) e no filtro da home. Puro e sem
// acesso a banco - recebe só os campos já buscados nas queries de cada
// página, pra poder rodar tanto no servidor (renderizar o badge) quanto no
// cliente (filtrar a lista sem round-trip).

export type EventStatus = "ativa" | "em-breve" | "encerrada";

export const STATUS_LABEL: Record<EventStatus, string> = {
  ativa: "Ativa",
  "em-breve": "Em breve",
  encerrada: "Encerrada",
};

export const STATUS_DOT: Record<EventStatus, string> = {
  ativa: "🟢",
  "em-breve": "🔵",
  encerrada: "🟡",
};

export function getEventStatus(event: {
  active: boolean;
  startAt: Date | string | null;
  endAt: Date | string | null;
  prizes?: { status: string }[];
}): EventStatus {
  const now = Date.now();
  const startAt = event.startAt ? new Date(event.startAt).getTime() : null;
  const endAt = event.endAt ? new Date(event.endAt).getTime() : null;

  // Ainda não começou - independe do sorteio estar "active" ou não, porque
  // um evento pode ser publicado como preview antes da data de início.
  if (startAt && startAt > now) return "em-breve";

  const hasDrawn = event.prizes?.some((p) => p.status === "DRAWN") ?? false;
  if (!event.active || hasDrawn || (endAt !== null && endAt < now)) return "encerrada";

  return "ativa";
}

// Uma Experiência agrupa vários sorteios que podem estar em estados
// diferentes entre si - usa o estado mais otimista: se pelo menos um
// sorteio dela está ativo, a experiência aparece como ativa.
export function getExperienceStatus(
  events: { active: boolean; startAt: Date | string | null; endAt: Date | string | null; prizes?: { status: string }[] }[]
): EventStatus {
  if (events.length === 0) return "encerrada";
  const statuses = events.map(getEventStatus);
  if (statuses.includes("ativa")) return "ativa";
  if (statuses.includes("em-breve")) return "em-breve";
  return "encerrada";
}
