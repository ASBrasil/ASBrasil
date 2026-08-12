"use client";

import { useState } from "react";
import { Button, Field, Input, Card } from "@/components/ui/primitives";

interface DraftPrize {
  name: string;
  description: string;
  scheduledAt: string;
}

export function PrizesStep({ eventId, onDone }: { eventId: string; onDone: () => void }) {
  const [saved, setSaved] = useState<string[]>([]);
  const [draft, setDraft] = useState<DraftPrize>({ name: "", description: "", scheduledAt: "" });
  const [saving, setSaving] = useState(false);

  async function addPrize() {
    if (!draft.name) return;
    setSaving(true);
    const res = await fetch("/api/admin/prizes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId,
        name: draft.name,
        description: draft.description || undefined,
        order: saved.length,
        scheduledAt: draft.scheduledAt || undefined,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved((s) => [...s, draft.name]);
      setDraft({ name: "", description: "", scheduledAt: "" });
    }
  }

  return (
    <Card icon="🎁">
      <h2>Cadastre os prêmios</h2>
      <p className="subtitle">Cada prêmio terá seu próprio sorteio, na ordem em que forem criados.</p>

      {saved.length > 0 && (
        <ul className="saved-list">
          {saved.map((name, i) => (
            <li key={i}>🎁 {name}</li>
          ))}
        </ul>
      )}

      <Field label="Nome do prêmio" required>
        <Input
          placeholder="Meet & Greet"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        />
      </Field>
      <Field label="Descrição">
        <Input
          placeholder="Encontro com a banda antes do show"
          value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
        />
      </Field>
      <Field label="Data e hora do sorteio" hint="Opcional, pode definir depois">
        <Input
          type="datetime-local"
          value={draft.scheduledAt}
          onChange={(e) => setDraft({ ...draft, scheduledAt: e.target.value })}
        />
      </Field>

      <div className="actions">
        <Button variant="ghost" onClick={addPrize} disabled={!draft.name || saving}>
          {saving ? "Adicionando…" : "+ Adicionar outro prêmio"}
        </Button>
        <Button onClick={onDone} disabled={saved.length === 0}>
          Continuar →
        </Button>
      </div>

      <style jsx>{`
        h2 { margin: 0 0 0.35rem; }
        .subtitle { color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1.5rem; }
        .saved-list {
          list-style: none;
          padding: 0;
          margin: 0 0 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        .saved-list li {
          font-size: 0.9rem;
          background: var(--bg);
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
        }
        .actions { display: flex; gap: 0.75rem; margin-top: 1.25rem; }
      `}</style>
    </Card>
  );
}
