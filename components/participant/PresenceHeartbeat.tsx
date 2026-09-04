"use client";

import { useEffect } from "react";

const INTERVAL_MS = 25_000;

/**
 * Não renderiza nada - só manda um ping pra /api/public/presence a cada
 * ~25s enquanto essa aba está aberta E visível (pausa quando a pessoa troca
 * de aba, pra "online agora" no admin não contar quem só deixou aberta em
 * segundo plano). Um evento por Participant.eventId, então basta montar
 * uma vez na página do painel.
 */
export function PresenceHeartbeat({ eventId }: { eventId: string }) {
  useEffect(() => {
    let cancelled = false;

    function ping() {
      if (document.visibilityState !== "visible") return;
      fetch("/api/public/presence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
        keepalive: true,
      }).catch(() => {});
    }

    ping();
    const interval = window.setInterval(() => {
      if (!cancelled) ping();
    }, INTERVAL_MS);

    function onVisibilityChange() {
      if (document.visibilityState === "visible") ping();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [eventId]);

  return null;
}
