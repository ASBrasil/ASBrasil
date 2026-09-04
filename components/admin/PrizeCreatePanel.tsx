"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input } from "@/components/ui/primitives";
import { ImageUpload } from "@/components/admin/ImageUpload";

const EMPTY = {
  name: "",
  description: "",
  imageUrl: null as string | null,
  scheduledAt: "",
  autoDraw: false,
  surprise: false,
  unlockAt: "",
};

/**
 * "➕ Adicionar prêmio" direto na página do evento - antes só dava pra
 * criar prêmio no assistente de criação do evento (PrizesStep) ou
 * duplicando um já existente. É o mesmo POST /api/admin/prizes que os
 * dois já usam, só que reaberto aqui pra eventos que já existem -
 * inclusive pra adicionar um prêmio surpresa e prolongar a campanha.
 */
export function PrizeCreatePanel({ eventId }: { eventId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/admin/prizes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId,
        name: form.name,
        description: form.description || null,
        imageUrl: form.imageUrl,
        scheduledAt: form.scheduledAt || null,
        autoDraw: form.autoDraw,
        surprise: form.surprise,
        unlockAt: form.surprise ? form.unlockAt || null : null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      setError("Não foi possível criar o prêmio. Tente novamente.");
      return;
    }
    setForm(EMPTY);
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button type="button" className="add-toggle" onClick={() => setOpen(true)}>
        ➕ Adicionar prêmio
        <style jsx>{`
          .add-toggle {
            background: var(--indigo-600);
            color: white;
            border: none;
            border-radius: 999px;
            padding: 0.55rem 1.1rem;
            font-size: 0.85rem;
            font-weight: 700;
            cursor: pointer;
          }
        `}</style>
      </button>
    );
  }

  return (
    <div className="create-panel">
      <h3>Novo prêmio</h3>

      <Field label="Nome do prêmio" required>
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </Field>

      <ImageUpload
        label="Imagem do prêmio"
        value={form.imageUrl}
        onChange={(url) => setForm({ ...form, imageUrl: url })}
        folder="prize-images"
        aspectRatio="4 / 3"
      />

      <Field label="Descrição">
        <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </Field>

      <Field label="Data e hora do sorteio" hint="Aparece como contagem regressiva para o participante.">
        <Input
          type="datetime-local"
          value={form.scheduledAt}
          onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
        />
      </Field>

      {form.scheduledAt && (
        <label className="check-row">
          <input
            type="checkbox"
            checked={form.autoDraw}
            onChange={(e) => setForm({ ...form, autoDraw: e.target.checked })}
          />
          <span>
            <strong>🤖 Sortear automaticamente</strong>
            <small>No horário marcado acima, o sistema sorteia sozinho.</small>
          </span>
        </label>
      )}

      <label className="check-row">
        <input
          type="checkbox"
          checked={form.surprise}
          onChange={(e) => setForm({ ...form, surprise: e.target.checked })}
        />
        <span>
          <strong>🎁 Marcar como surpresa</strong>
          <small>
            Participantes veem só um teaser com contador (ou "data a definir") até revelar -
            ótimo pra prolongar a campanha sem contar tudo de uma vez.
          </small>
        </span>
      </label>

      {form.surprise && (
        <Field label="Revelar em" hint='Deixe em branco pra "data a definir".'>
          <Input
            type="datetime-local"
            value={form.unlockAt}
            onChange={(e) => setForm({ ...form, unlockAt: e.target.value })}
          />
        </Field>
      )}

      {error && <p className="error">{error}</p>}

      <div className="actions">
        <Button
          variant="ghost"
          onClick={() => {
            setForm(EMPTY);
            setOpen(false);
          }}
          disabled={saving}
        >
          Cancelar
        </Button>
        <Button onClick={save} disabled={saving || !form.name}>
          {saving ? "Criando…" : "Criar prêmio"}
        </Button>
      </div>

      <style jsx>{`
        .create-panel {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 0.75rem;
          padding: 1.25rem 1.5rem;
          margin-bottom: 0.75rem;
          max-width: 32rem;
        }
        h3 {
          margin: 0 0 1rem;
          font-family: var(--font-display, inherit);
          font-size: 1rem;
        }
        .check-row {
          display: flex;
          align-items: flex-start;
          gap: 0.65rem;
          margin: 0.9rem 0;
          padding: 0.85rem 1rem;
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 0.6rem;
          cursor: pointer;
        }
        .check-row input { margin-top: 0.2rem; flex-shrink: 0; }
        .check-row span { display: flex; flex-direction: column; gap: 0.15rem; }
        .check-row small { color: var(--text-muted); font-size: 0.8rem; }
        .actions { display: flex; gap: 0.6rem; margin-top: 1rem; }
        .error { color: #c0392b; font-size: 0.82rem; }
      `}</style>
    </div>
  );
}
