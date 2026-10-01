"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input } from "@/components/ui/primitives";
import { ImageUpload } from "@/components/admin/ImageUpload";

interface UniverseCharacterRow {
  id: string;
  eventId: string;
  eventName: string;
  name: string;
  imageUrl: string | null;
  order: number;
}

const EMPTY_FORM = { eventId: "", name: "", imageUrl: null as string | null, order: 0 };

function formFromCharacter(c: UniverseCharacterRow) {
  return { eventId: c.eventId, name: c.name, imageUrl: c.imageUrl, order: c.order };
}

/**
 * Avatares pickáveis do hub Universo AS (/e/[slug]/arcade), por evento - só
 * nome + imagem, sem nenhuma lógica de desbloqueio. Separado de propósito
 * do sistema de Personagens-recompensa (ExperienceCharactersManager.tsx).
 */
export function UniverseCharacterManager({
  characters: initialCharacters,
  events,
}: {
  characters: UniverseCharacterRow[];
  events: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [characters, setCharacters] = useState(initialCharacters);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    router.refresh();
    fetch("/api/admin/universe-characters")
      .then((r) => r.json())
      .then((d) =>
        setCharacters(
          (d.characters ?? []).map((c: any) => ({
            id: c.id,
            eventId: c.eventId,
            eventName: c.event?.name ?? "",
            name: c.name,
            imageUrl: c.imageUrl,
            order: c.order,
          }))
        )
      );
  }

  return (
    <div className="wrap">
      <div className="section-header">
        <p className="section-title">Personagens do Universo AS</p>
        {!creating && <Button onClick={() => setCreating(true)}>+ Novo personagem</Button>}
      </div>
      <p className="hint">
        Elenco de avatares escolhíveis no hub do arcade, por evento - puramente visual, sem relação
        com o sistema de Personagens-prêmio das Experiências.
      </p>
      {error && <p className="error">{error}</p>}

      {creating && (
        <div className="as-card form">
          <CharacterFormFields
            initial={{ ...EMPTY_FORM, eventId: events[0]?.id ?? "" }}
            events={events}
            onCancel={() => setCreating(false)}
            onSave={async (form) => {
              const res = await fetch("/api/admin/universe-characters", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
              });
              if (!res.ok) {
                const b = await res.json().catch(() => ({}));
                setError(b.error || "Não deu pra criar.");
                return;
              }
              setCreating(false);
              refresh();
            }}
            saveLabel="Criar personagem"
          />
        </div>
      )}

      <div className="grid">
        {characters.map((character) => (
          <div key={character.id} className="as-card card">
            {editingId === character.id ? (
              <CharacterFormFields
                initial={formFromCharacter(character)}
                events={events}
                onCancel={() => setEditingId(null)}
                onSave={async (form) => {
                  const res = await fetch(`/api/admin/universe-characters/${character.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(form),
                  });
                  if (!res.ok) {
                    const b = await res.json().catch(() => ({}));
                    setError(b.error || "Não deu pra salvar.");
                    return;
                  }
                  setEditingId(null);
                  refresh();
                }}
                saveLabel="Salvar alterações"
              />
            ) : (
              <div className="preview-card">
                {character.imageUrl ? (
                  <img src={character.imageUrl} alt={character.name} className="thumb" />
                ) : (
                  <div className="thumb placeholder">🧸</div>
                )}
                <p className="name">{character.name}</p>
                <span className="event-name">{character.eventName}</span>
                <div className="actions">
                  <button type="button" className="edit-btn" onClick={() => setEditingId(character.id)}>
                    ✏️ Editar
                  </button>
                  <button
                    type="button"
                    className="delete-btn"
                    onClick={async () => {
                      if (!confirm(`Excluir "${character.name}" do elenco do Universo AS?`)) return;
                      await fetch(`/api/admin/universe-characters/${character.id}`, { method: "DELETE" });
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
        {characters.length === 0 && !creating && (
          <p className="empty">Nenhum personagem cadastrado ainda.</p>
        )}
      </div>

      <style jsx>{`
        .wrap {
          max-width: 56rem;
          margin-top: 2.5rem;
        }
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          margin-bottom: 0.4rem;
        }
        .section-title {
          font-size: 1.05rem;
          font-weight: 700;
          margin: 0;
          font-family: var(--font-display, inherit);
        }
        .hint {
          color: var(--as-muted, var(--text-muted));
          font-size: 0.85rem;
          margin: 0 0 1rem;
          line-height: 1.5;
          max-width: 42rem;
        }
        .error {
          color: var(--as-red, #c0392b);
          font-size: 0.85rem;
          margin: 0 0 0.75rem;
        }
        .form {
          padding: 1.1rem 1.25rem;
          margin-bottom: 1rem;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(13rem, 1fr));
          gap: 0.75rem;
        }
        .card {
          padding: 1.1rem 1.25rem;
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
        .event-name {
          font-size: 0.72rem;
          color: var(--as-muted, var(--text-muted));
          margin-bottom: 0.6rem;
        }
        .actions {
          display: flex;
          flex-wrap: wrap;
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
          color: var(--as-muted, var(--text-muted));
          cursor: pointer;
        }
        .delete-btn {
          color: #c0392b;
        }
        .empty {
          color: var(--as-muted, var(--text-muted));
          font-size: 0.9rem;
        }
      `}</style>
    </div>
  );
}

function CharacterFormFields({
  initial,
  events,
  onSave,
  onCancel,
  saveLabel,
}: {
  initial: typeof EMPTY_FORM;
  events: { id: string; name: string }[];
  onSave: (form: typeof EMPTY_FORM) => Promise<void>;
  onCancel: () => void;
  saveLabel: string;
}) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);

  const canSave = Boolean(form.eventId && form.name.trim());

  return (
    <div>
      <Field label="Evento" required>
        <select
          className="as-select"
          value={form.eventId}
          onChange={(e) => setForm({ ...form, eventId: e.target.value })}
        >
          {events.length === 0 && <option value="">Nenhum evento cadastrado</option>}
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Nome do personagem" required>
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </Field>
      <ImageUpload
        label="Imagem do personagem"
        value={form.imageUrl}
        onChange={(url) => setForm({ ...form, imageUrl: url })}
        folder="universe-characters"
        aspectRatio="1 / 1"
      />

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
        .form-actions {
          display: flex;
          gap: 0.6rem;
          margin-top: 0.5rem;
        }
      `}</style>
    </div>
  );
}
