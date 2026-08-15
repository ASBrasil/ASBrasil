"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input } from "@/components/ui/primitives";
import { ImageUpload } from "@/components/admin/ImageUpload";

interface EditablePrize {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  scheduledAt: string | null; // ISO string, already serialized by the server component
  winMessage: string | null;
  loseMessage: string | null;
  couponCode: string | null;
}

/** ISO string (UTC) -> "YYYY-MM-DDTHH:mm" in local time, what <input type="datetime-local"> expects. */
function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

export function PrizeEditPanel({ prize }: { prize: EditablePrize }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: prize.name,
    description: prize.description ?? "",
    imageUrl: prize.imageUrl,
    scheduledAt: toDatetimeLocalValue(prize.scheduledAt),
    winMessage: prize.winMessage ?? "",
    loseMessage: prize.loseMessage ?? "",
    couponCode: prize.couponCode ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/prizes/${prize.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        description: form.description || null,
        imageUrl: form.imageUrl,
        scheduledAt: form.scheduledAt || null,
        winMessage: form.winMessage || null,
        loseMessage: form.loseMessage || null,
        couponCode: form.couponCode || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      setError("Não foi possível salvar. Tente novamente.");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="wrap">
      {!open ? (
        <button type="button" className="edit-toggle" onClick={() => setOpen(true)}>
          ✏️ Editar
        </button>
      ) : (
        <div className="edit-panel">
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
            <Input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </Field>

          <Field label="Data e hora do sorteio" hint="Aparece como contagem regressiva para o participante.">
            <Input
              type="datetime-local"
              value={form.scheduledAt}
              onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
            />
          </Field>

          <div className="divider">
            <span>Mensagens de resultado</span>
          </div>

          <Field label="Mensagem para quem ganhar" hint="Em branco, usa a mensagem padrão.">
            <textarea
              className="textarea"
              rows={2}
              value={form.winMessage}
              onChange={(e) => setForm({ ...form, winMessage: e.target.value })}
            />
          </Field>
          <Field label="Cupom para o vencedor" hint="Opcional. Só aparece para quem ganhar.">
            <Input
              value={form.couponCode}
              onChange={(e) => setForm({ ...form, couponCode: e.target.value })}
            />
          </Field>
          <Field label="Mensagem para quem não ganhar">
            <textarea
              className="textarea"
              rows={2}
              value={form.loseMessage}
              onChange={(e) => setForm({ ...form, loseMessage: e.target.value })}
            />
          </Field>

          {error && <p className="error">{error}</p>}

          <div className="actions">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={saving || !form.name}>
              {saving ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        </div>
      )}

      <style jsx>{`
        .wrap:has(.edit-panel) {
          flex-basis: 100%;
        }
        .edit-toggle {
          background: none;
          border: 1px solid var(--border);
          color: var(--text-muted);
          border-radius: 999px;
          padding: 0.4rem 0.85rem;
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
        }
        .edit-toggle:hover {
          border-color: var(--indigo-600);
          color: var(--text);
        }
        .edit-panel {
          margin-top: 1rem;
          padding-top: 1.25rem;
          border-top: 1px solid var(--border);
        }
        .divider {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin: 1.5rem 0 1.1rem;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--text-muted);
        }
        .divider::before,
        .divider::after {
          content: "";
          flex: 1;
          height: 1px;
          background: var(--border);
        }
        .textarea {
          padding: 0.7rem 0.9rem;
          border-radius: 0.6rem;
          border: 1px solid var(--border);
          font-size: 0.9rem;
          font-family: inherit;
          resize: vertical;
          background: var(--surface);
          width: 100%;
          box-sizing: border-box;
        }
        .actions {
          display: flex;
          gap: 0.6rem;
          margin-top: 1rem;
        }
        .error {
          color: #c0392b;
          font-size: 0.82rem;
        }
      `}</style>
    </div>
  );
}
