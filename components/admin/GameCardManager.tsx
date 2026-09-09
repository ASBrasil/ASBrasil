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
  unlockEventId: string | null;
  unlockGameId: string | null;
}

interface Option {
  id: string;
  name: string;
}

const EMPTY_FORM = {
  name: "",
  rarity: "comum",
  imageUrl: null as string | null,
  description: "",
  unlockKind: "manual" as "manual" | "event" | "game",
  unlockEventId: "",
  unlockGameId: "",
};

function formFromCard(card: GameCard) {
  return {
    name: card.name,
    rarity: card.rarity,
    imageUrl: card.imageUrl,
    description: card.description ?? "",
    unlockKind: (card.unlockEventId ? "event" : card.unlockGameId ? "game" : "manual") as
      | "manual"
      | "event"
      | "game",
    unlockEventId: card.unlockEventId ?? "",
    unlockGameId: card.unlockGameId ?? "",
  };
}

function payloadFromForm(form: typeof EMPTY_FORM) {
  return {
    name: form.name,
    rarity: form.rarity,
    imageUrl: form.imageUrl,
    description: form.description,
    unlockEventId: form.unlockKind === "event" ? form.unlockEventId || null : null,
    unlockGameId: form.unlockKind === "game" ? form.unlockGameId || null : null,
  };
}

export function GameCardManager({
  cards: initialCards,
  events,
  games,
}: {
  cards: GameCard[];
  events: Option[];
  games: Option[];
}) {
  const router = useRouter();
  const [cards, setCards] = useState(initialCards);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [grantingId, setGrantingId] = useState<string | null>(null);

  function refresh() {
    router.refresh();
    fetch("/api/admin/game-cards")
      .then((r) => r.json())
      .then((d) => setCards(d.cards ?? []));
  }

  function unlockLabel(card: GameCard) {
    if (card.unlockEventId) {
      const ev = events.find((e) => e.id === card.unlockEventId);
      return `🎟️ Ao se inscrever em: ${ev?.name ?? "evento removido"}`;
    }
    if (card.unlockGameId) {
      const gm = games.find((g) => g.id === card.unlockGameId);
      return `🏆 100% do jogo: ${gm?.name ?? "jogo removido"}`;
    }
    return "✋ Só concessão manual";
  }

  return (
    <div className="wrap">
      {!creating && <Button onClick={() => setCreating(true)}>+ Nova carta</Button>}

      {creating && (
        <div className="card">
          <CardFormFields
            initial={EMPTY_FORM}
            events={events}
            games={games}
            onCancel={() => setCreating(false)}
            onSave={async (form) => {
              await fetch("/api/admin/game-cards", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payloadFromForm(form)),
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
                initial={formFromCard(card)}
                events={events}
                games={games}
                onCancel={() => setEditingId(null)}
                onSave={async (form) => {
                  await fetch(`/api/admin/game-cards/${card.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payloadFromForm(form)),
                  });
                  setEditingId(null);
                  refresh();
                }}
                saveLabel="Salvar alterações"
              />
            ) : grantingId === card.id ? (
              <GrantPanel
                card={card}
                onCancel={() => setGrantingId(null)}
                onDone={() => setGrantingId(null)}
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
                <span className="unlock-tag">{unlockLabel(card)}</span>
                <div className="actions">
                  <button type="button" className="edit-btn" onClick={() => setEditingId(card.id)}>
                    ✏️ Editar
                  </button>
                  <button type="button" className="edit-btn" onClick={() => setGrantingId(card.id)}>
                    🎁 Dar figurinha
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
          margin-bottom: 0.4rem;
        }
        .unlock-tag {
          font-size: 0.72rem;
          color: var(--text-muted);
          margin-bottom: 0.6rem;
          line-height: 1.4;
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

function GrantPanel({
  card,
  onCancel,
  onDone,
}: {
  card: GameCard;
  onCancel: () => void;
  onDone: () => void;
}) {
  const [emails, setEmails] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function send(body: Record<string, unknown>) {
    setSending(true);
    setResult(null);
    const res = await fetch(`/api/admin/game-cards/${card.id}/grant`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    setSending(false);
    if (!res.ok) {
      setResult(data.error ?? "Não foi possível conceder a figurinha.");
      return;
    }
    setResult(`✓ Concedida a ${data.granted} de ${data.total} e-mail(s).`);
  }

  return (
    <div className="grant">
      <p className="grant-title">🎁 Dar "{card.name}" manualmente</p>
      <p className="grant-hint">Um e-mail por linha (ou separados por vírgula).</p>
      <textarea
        className="textarea"
        rows={4}
        value={emails}
        onChange={(e) => setEmails(e.target.value)}
        placeholder={"maria@exemplo.com\njoao@exemplo.com"}
      />
      <div className="grant-actions">
        <Button variant="ghost" onClick={onCancel} disabled={sending}>
          Fechar
        </Button>
        <Button
          onClick={() => send({ emails })}
          disabled={sending || !emails.trim()}
        >
          {sending ? "Enviando…" : "Conceder"}
        </Button>
      </div>
      {card.unlockEventId && (
        <button
          type="button"
          className="backfill-btn"
          disabled={sending}
          onClick={() => send({ backfillEvent: true })}
        >
          ↺ Aplicar a todo mundo já inscrito nesse evento
        </button>
      )}
      {result && <p className="grant-result">{result}</p>}

      <style jsx>{`
        .grant-title {
          margin: 0 0 0.2rem;
          font-weight: 700;
          font-size: 0.9rem;
        }
        .grant-hint {
          margin: 0 0 0.6rem;
          font-size: 0.78rem;
          color: var(--text-muted);
        }
        .textarea {
          width: 100%;
          box-sizing: border-box;
          padding: 0.7rem 0.9rem;
          border-radius: 0.6rem;
          border: 1px solid var(--border);
          font-size: 0.85rem;
          font-family: inherit;
          resize: vertical;
          background: var(--surface);
          color: var(--text);
        }
        .grant-actions {
          display: flex;
          gap: 0.6rem;
          margin-top: 0.6rem;
        }
        .backfill-btn {
          display: block;
          width: 100%;
          margin-top: 0.6rem;
          font-size: 0.78rem;
          font-weight: 600;
          padding: 0.5rem 0.7rem;
          border-radius: 0.5rem;
          border: 1px dashed var(--border);
          background: none;
          color: var(--indigo-600);
          cursor: pointer;
        }
        .grant-result {
          margin: 0.6rem 0 0;
          font-size: 0.8rem;
        }
      `}</style>
    </div>
  );
}

function CardFormFields({
  initial,
  events,
  games,
  onSave,
  onCancel,
  saveLabel,
}: {
  initial: typeof EMPTY_FORM;
  events: Option[];
  games: Option[];
  onSave: (form: typeof EMPTY_FORM) => Promise<void>;
  onCancel: () => void;
  saveLabel: string;
}) {
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);

  const canSave =
    form.name.trim().length > 0 &&
    (form.unlockKind !== "event" || form.unlockEventId) &&
    (form.unlockKind !== "game" || form.unlockGameId);

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

      <Field
        label="Como se ganha essa carta?"
        hint="Além disso, qualquer carta também pode ser dada na mão pelo botão 'Dar figurinha' da listagem."
      >
        <select
          value={form.unlockKind}
          onChange={(e) =>
            setForm({ ...form, unlockKind: e.target.value as typeof form.unlockKind })
          }
        >
          <option value="manual">Só concessão manual</option>
          <option value="event">Automática ao se inscrever num sorteio</option>
          <option value="game">Automática ao completar 100% de um jogo</option>
        </select>
      </Field>

      {form.unlockKind === "event" && (
        <Field label="Qual sorteio?">
          <select
            value={form.unlockEventId}
            onChange={(e) => setForm({ ...form, unlockEventId: e.target.value })}
          >
            <option value="">Selecione...</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.name}
              </option>
            ))}
          </select>
        </Field>
      )}

      {form.unlockKind === "game" && (
        <Field label="Qual jogo?" hint="100% = todas as fases concluídas com nota máxima.">
          <select
            value={form.unlockGameId}
            onChange={(e) => setForm({ ...form, unlockGameId: e.target.value })}
          >
            <option value="">Selecione...</option>
            {games.map((gm) => (
              <option key={gm.id} value={gm.id}>
                {gm.name}
              </option>
            ))}
          </select>
        </Field>
      )}

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
        select {
          width: 100%;
          box-sizing: border-box;
          padding: 0.6rem 0.7rem;
          border-radius: 0.5rem;
          border: 1px solid var(--border);
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