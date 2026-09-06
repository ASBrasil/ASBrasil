"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input } from "@/components/ui/primitives";
import { ImageUpload } from "@/components/admin/ImageUpload";

interface GameCard {
  id: string;
  name: string;
  rarity: string;
  imageUrl: string | null;
  description: string | null;
}

const EMPTY_FORM = {
  name: "",
  rarity: "comum",
  imageUrl: null as string | null,
  description: "",
};

export function GameCardManager({ cards: initialCards }: { cards: GameCard[] }) {
  const router = useRouter();
  const [cards, setCards] = useState(initialCards);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  function refresh() {
    router.refresh();
    fetch("/api/admin/game-cards")
      .then((r) => r.json())
      .then((d) => setCards(d.cards ?? []));
  }

  return (
    <div className="wrap">
      {!creating && <Button onClick={() => setCreating(true)}>+ Nova carta</Button>}

      {creating && (
        <div className="card">
          <CardFormFields
            initial={EMPTY_FORM}
            onCancel={() => setCreating(false)}
            onSave={async (form) => {
              await fetch("/api/admin/game-cards", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
              });
              setCreating(false);
              refresh();
            }}
            saveLabel="Criar carta"
          />
        </div>
      )}

      <div className="grid">
        {cards.map((card) => (
          <div key={card.id} className="card">
            {editingId === card.id ? (
              <CardFormFields
                initial={{
                  name: card.name,
                  rarity: card.rarity,
                  imageUrl: card.imageUrl,
                  description: card.description ?? "",
                }}
                onCancel={() => setEditingId(null)}
                onSave={async (form) => {
                  await fetch(`/api/admin/game-cards/${card.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(form),
                  });
                  setEditingId(null);
                  refresh();
                }}
                saveLabel="Salvar alterações"
              />
            ) : (
              <div className="preview-card">
                {card.imageUrl ? (
                  <img src={card.imageUrl} alt={card.name} className="thumb" />
                ) : (
                  <div className="thumb placeholder">🎴</div>
                )}
                <p className="name">{card.name}</p>
                <span className="rarity">{card.rarity}</span>
                <div className="actions">
                  <button type="button" className="edit-btn" onClick={() => setEditingId(card.id)}>
                    ✏️ Editar
                  </button>
                  <button
                    type="button"
                    className="delete-btn"
                    onClick={async () => {
                      if (!confirm("Excluir essa carta? Ela some do álbum de quem já tinha.")) return;
                      await fetch(`/api/admin/game-cards/${card.id}`, { method: "DELETE" });
                      refresh();
                    }}
                  >
                    Excluir
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {cards.length === 0 && !creating && <p className="empty">Nenhuma carta criada ainda.</p>}
      </div>

      <style jsx>{`
        .wrap {
          max-width: 52rem;
        }
        .card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 0.75rem;
          padding: 1.1rem 1.25rem;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(13rem, 1fr));
          gap: 0.75rem;
          margin-top: 1rem;
        }
        .preview-card {
          display: flex;
          flex-direction: column;
        }
        .thumb {
          width: 100%;
          aspect-ratio: 1 / 1;
          object-fit: cover;
          border-radius: 0.5rem;
          margin-bottom: 0.6rem;
        }
        .thumb.placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg);
          font-size: 2rem;
        }
        .name {
          margin: 0 0 0.2rem;
          font-weight: 600;
          font-size: 0.9rem;
        }
        .rarity {
          font-size: 0.72rem;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          margin-bottom: 0.6rem;
        }
        .actions {
          display: flex;
          gap: 0.4rem;
        }
        .edit-btn,
        .delete-btn {
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.35rem 0.65rem;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: none;
          color: var(--text-muted);
          cursor: pointer;
        }
        .delete-btn {
          color: #c0392b;
        }
        .empty {
          color: var(--text-muted);
          font-size: 0.9rem;
        }
      `}</style>
    </div>
  );
}

function CardFormFields({
  initial,
  onSave,
  onCancel,
  saveLabel,
}: {
  initial: typeof EMPTY_FORM;
  onSave: (form: typeof EMPTY_FORM) => Promise<void>;
  onCancel: () => void;
  saveLabel: string;
}) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);

  const canSave = form.name.trim().length > 0;

  return (
    <div>
      <Field label="Nome da carta" required>
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </Field>
      <Field label="Raridade" hint="Texto livre, ex: comum, raro, épico, lendário.">
        <Input value={form.rarity} onChange={(e) => setForm({ ...form, rarity: e.target.value })} />
      </Field>
      <ImageUpload
        label="Imagem da carta"
        value={form.imageUrl}
        onChange={(url) => setForm({ ...form, imageUrl: url })}
        folder="game-cards"
        aspectRatio="1 / 1"
      />
      <Field label="Descrição" hint="Opcional.">
        <textarea
          className="textarea"
          rows={3}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </Field>
      <div className="form-actions">
        <Button variant="ghost" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
        <Button
          onClick={async () => {
            setSaving(true);
            await onSave(form);
            setSaving(false);
          }}
          disabled={!canSave || saving}
        >
          {saving ? "Salvando…" : saveLabel}
        </Button>
      </div>

      <style jsx>{`
        .textarea {
          width: 100%;
          box-sizing: border-box;
          padding: 0.7rem 0.9rem;
          border-radius: 0.6rem;
          border: 1px solid var(--border);
          font-size: 0.9rem;
          font-family: inherit;
          resize: vertical;
          background: var(--surface);
          color: var(--text);
        }
        .form-actions {
          display: flex;
          gap: 0.6rem;
          margin-top: 0.5rem;
        }
      `}</style>
    </div>
  );
}
