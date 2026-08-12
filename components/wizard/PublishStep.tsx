"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components/ui/primitives";

export function PublishStep({ eventId, slug }: { eventId: string; slug: string }) {
  const router = useRouter();
  const [publishing, setPublishing] = useState(false);
  const publicUrl = typeof window !== "undefined" ? `${window.location.origin}/e/${slug}` : `/e/${slug}`;

  async function publish() {
    setPublishing(true);
    await fetch(`/api/admin/events/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: true }),
    });
    setPublishing(false);
    router.push(`/admin/events/${eventId}`);
  }

  return (
    <Card icon="🚀">
      <h2>Tudo pronto para publicar</h2>
      <p className="subtitle">
        A campanha ficará disponível em <strong>{publicUrl}</strong>. Você ainda pode editar tudo
        depois pelo painel.
      </p>
      <div className="actions">
        <Button onClick={publish} disabled={publishing}>
          {publishing ? "Publicando…" : "Publicar evento →"}
        </Button>
      </div>
      <style jsx>{`
        h2 { margin: 0 0 0.35rem; }
        .subtitle { color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1.5rem; }
        .actions { margin-top: 1rem; }
      `}</style>
    </Card>
  );
}
