"use client";

import { useState } from "react";
import { Button, Field, Input, Card } from "@/components/ui/primitives";
import { ImageUpload } from "@/components/admin/ImageUpload";

interface DraftPrize {
  name: string;
  description: string;
  scheduledAt: string;
  imageUrl: string | null;
  winMessage: string;
  loseMessage: string;
  couponCode: string;
}

interface SavedPrize {
  id: string;
  name: string;
  imageUrl: string | null;
}

const EMPTY_DRAFT: DraftPrize = {
  name: "",
  description: "",
  scheduledAt: "",
  imageUrl: null,
  winMessage: "",
  loseMessage: "",
  couponCode: "",
};

/** ISO string (UTC) -> "YYYY-MM-DDTHH:mm" em horário local, o que <input type="datetime-local"> espera. */
function toDatetimeLocalValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

export function PrizesStep({
  eventId,
  onDone,
  onBack,
  existingPrizes = [],
}: {
  eventId: string;
  onDone: () => void;
  onBack?: () => void;
  existingPrizes?: { id: string; name: string; imageUrl?: string | null }[];
}) {
  const [saved, setSaved] = useState<SavedPrize[]>(
    existingPrizes.map((p) => ({ id: p.id, name: p.name, imageUrl: p.imageUrl ?? null }))
  );
  // Só abre o formulário de cara se ainda não tem nenhum prêmio - com pelo
  // menos um já salvo, só pergunta se quer outro (o pedido original: não
  // precisa abrir todos os campos de novo sem a pessoa pedir).
  const [formOpen, setFormOpen] = useState(saved.length === 0);
  const [draft, setDraft] = useState<DraftPrize>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<DraftPrize | null>(null);
  const [editLoading, setEditLoading] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

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
        imageUrl: draft.imageUrl || undefined,
        winMessage: draft.winMessage || undefined,
        loseMessage: draft.loseMessage || undefined,
        couponCode: draft.couponCode || undefined,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (res.ok) {
      setSaved((s) => [...s, { id: data.prize.id, name: draft.name, imageUrl: draft.imageUrl }]);
      setDraft(EMPTY_DRAFT);
      setFormOpen(false); // fecha e passa pra pergunta "quer mais um?"
    }
  }

  async function openEdit(id: string) {
    setEditingId(id);
    setEditLoading(true);
    const res = await fetch(`/api/admin/prizes/${id}`);
    const data = await res.json();
    setEditLoading(false);
    if (res.ok) {
      const p = data.prize;
      setEditDraft({
        name: p.name,
        description: p.description ?? "",
        scheduledAt: toDatetimeLocalValue(p.scheduledAt),
        imageUrl: p.imageUrl,
        winMessage: p.winMessage ?? "",
        loseMessage: p.loseMessage ?? "",
        couponCode: p.couponCode ?? "",
      });
    } else {
      setEditingId(null);
    }
  }

  function cancelEdit() {
    setEditingId(null);
    setEditDraft(null);
  }

  async function saveEdit() {
    if (!editingId || !editDraft) return;
    setEditSaving(true);
    const res = await fetch(`/api/admin/prizes/${editingId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editDraft.name,
        description: editDraft.description || null,
        imageUrl: editDraft.imageUrl,
        scheduledAt: editDraft.scheduledAt || null,
        winMessage: editDraft.winMessage || null,
        loseMessage: editDraft.loseMessage || null,
        couponCode: editDraft.couponCode || null,
      }),
    });
    setEditSaving(false);
    if (res.ok) {
      setSaved((s) =>
        s.map((p) => (p.id === editingId ? { ...p, name: editDraft.name, imageUrl: editDraft.imageUrl } : p))
      );
      cancelEdit();
    }
  }

  return (
    <Card icon="🎁">
      <h2>Cadastre os prêmios</h2>
      <p className="subtitle">Cada prêmio terá seu próprio sorteio, na ordem em que forem criados.</p>

      {saved.length > 0 && (
        <ul className="saved-list">
          {saved.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className={`saved-item ${editingId === p.id ? "active" : ""}`}
                onClick={() => (editingId === p.id ? cancelEdit() : openEdit(p.id))}
              >
                {p.imageUrl ? (
                  <img src={p.imageUrl} alt="" className="thumb" />
                ) : (
                  <span className="thumb placeholder">🎁</span>
                )}
                <span className="saved-name">{p.name}</span>
                <span className="edit-hint">{editingId === p.id ? "Fechar" : "Editar"}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {editingId ? (
        <div className="inline-form">
          {editLoading || !editDraft ? (
            <p className="loading">Carregando…</p>
          ) : (
            <>
              <Field label="Nome do prêmio" required>
                <Input
                  value={editDraft.name}
                  onChange={(e) => setEditDraft({ ...editDraft, name: e.target.value })}
                />
              </Field>

              <ImageUpload
                label="Imagem do prêmio"
                value={editDraft.imageUrl}
                onChange={(url) => setEditDraft({ ...editDraft, imageUrl: url })}
                folder="prize-images"
                aspectRatio="4 / 3"
              />

              <Field label="Descrição">
                <Input
                  value={editDraft.description}
                  onChange={(e) => setEditDraft({ ...editDraft, description: e.target.value })}
                />
              </Field>
              <Field label="Data e hora do sorteio">
                <Input
                  type="datetime-local"
                  value={editDraft.scheduledAt}
                  onChange={(e) => setEditDraft({ ...editDraft, scheduledAt: e.target.value })}
                />
              </Field>

              <div className="divider">
                <span>Mensagens de resultado</span>
              </div>
              <Field label="Mensagem para quem ganhar">
                <textarea
                  className="textarea"
                  rows={2}
                  value={editDraft.winMessage}
                  onChange={(e) => setEditDraft({ ...editDraft, winMessage: e.target.value })}
                />
              </Field>
              <Field label="Cupom para o vencedor">
                <Input
                  value={editDraft.couponCode}
                  onChange={(e) => setEditDraft({ ...editDraft, couponCode: e.target.value })}
                />
              </Field>
              <Field label="Mensagem para quem não ganhar">
                <textarea
                  className="textarea"
                  rows={2}
                  value={editDraft.loseMessage}
                  onChange={(e) => setEditDraft({ ...editDraft, loseMessage: e.target.value })}
                />
              </Field>

              <div className="actions">
                <Button variant="ghost" onClick={cancelEdit} disabled={editSaving}>
                  Cancelar
                </Button>
                <Button onClick={saveEdit} disabled={editSaving || !editDraft.name}>
                  {editSaving ? "Salvando…" : "Salvar alterações"}
                </Button>
              </div>
            </>
          )}
        </div>
      ) : formOpen ? (
        <div className="inline-form">
          <Field label="Nome do prêmio" required>
            <Input
              placeholder="Meet & Greet"
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </Field>

          <ImageUpload
            label="Imagem do prêmio"
            hint="Aparece no card do prêmio e na tela de resultado do participante."
            value={draft.imageUrl}
            onChange={(url) => setDraft({ ...draft, imageUrl: url })}
            folder="prize-images"
            aspectRatio="4 / 3"
          />

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

          <div className="divider">
            <span>Mensagens de resultado</span>
          </div>

          <Field
            label="Mensagem para quem ganhar"
            hint="Aparece na tela de resultado só para o vencedor. Em branco, usa a mensagem padrão."
          >
            <textarea
              className="textarea"
              rows={2}
              placeholder="Parabéns! Você ganhou o Meet & Greet 🎉 Fique de olho no seu e-mail com os detalhes."
              value={draft.winMessage}
              onChange={(e) => setDraft({ ...draft, winMessage: e.target.value })}
            />
          </Field>
          <Field
            label="Cupom para o vencedor"
            hint="Opcional. Mostrado junto com a mensagem de vitória, só para quem ganhar."
          >
            <Input
              placeholder="MEETBTS10"
              value={draft.couponCode}
              onChange={(e) => setDraft({ ...draft, couponCode: e.target.value })}
            />
          </Field>
          <Field
            label="Mensagem para quem não ganhar"
            hint="Aparece para todo mundo que concorreu a esse prêmio e não ganhou."
          >
            <textarea
              className="textarea"
              rows={2}
              placeholder="Essa foi por pouco! Ainda tem mais sorteios rolando, continue de olho."
              value={draft.loseMessage}
              onChange={(e) => setDraft({ ...draft, loseMessage: e.target.value })}
            />
          </Field>

          <div className="actions">
            {onBack && (
              <Button variant="ghost" onClick={onBack} disabled={saving}>
                ← Voltar
              </Button>
            )}
            {saved.length > 0 && (
              <Button variant="ghost" onClick={() => setFormOpen(false)} disabled={saving}>
                Cancelar
              </Button>
            )}
            <Button onClick={addPrize} disabled={!draft.name || saving}>
              {saving ? "Adicionando…" : "Adicionar prêmio"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="prompt">
          <p>Quer adicionar mais um prêmio?</p>
          <div className="actions">
            {onBack && <Button variant="ghost" onClick={onBack}>← Voltar</Button>}
            <Button variant="ghost" onClick={() => setFormOpen(true)}>
              + Adicionar outro prêmio
            </Button>
            <Button onClick={onDone}>{saved.length === 0 ? "Pular por agora →" : "Continuar →"}</Button>
          </div>
        </div>
      )}

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
        .saved-item {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          width: 100%;
          font-size: 0.9rem;
          background: var(--bg);
          border: 1px solid transparent;
          border-radius: 0.5rem;
          padding: 0.4rem 0.75rem;
          cursor: pointer;
          text-align: left;
        }
        .saved-item:hover,
        .saved-item.active {
          border-color: var(--indigo-600);
        }
        .thumb {
          width: 1.75rem;
          height: 1.75rem;
          border-radius: 0.4rem;
          object-fit: cover;
          flex-shrink: 0;
        }
        .thumb.placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--surface);
          font-size: 0.9rem;
        }
        .saved-name {
          flex: 1;
        }
        .edit-hint {
          font-size: 0.75rem;
          font-weight: 600;
          color: var(--indigo-600);
          flex-shrink: 0;
        }
        .prompt {
          padding: 1.5rem;
          background: var(--bg);
          border: 1px dashed var(--border);
          border-radius: 0.75rem;
          text-align: center;
        }
        .prompt p {
          margin: 0 0 1rem;
          color: var(--text-muted);
          font-size: 0.92rem;
        }
        .prompt .actions {
          justify-content: center;
        }
        .loading {
          color: var(--text-muted);
          font-size: 0.88rem;
        }
        .divider {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin: 1.75rem 0 1.25rem;
          font-size: 0.78rem;
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
        .actions { display: flex; gap: 0.75rem; margin-top: 1.25rem; flex-wrap: wrap; }
      `}</style>
    </Card>
  );
}
