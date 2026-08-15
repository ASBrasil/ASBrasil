"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input } from "@/components/ui/primitives";
import { ImageUpload } from "@/components/admin/ImageUpload";

type PopupType = "TEXT" | "IMAGE" | "HTML";

interface Popup {
  id: string;
  active: boolean;
  type: PopupType;
  title: string | null;
  body: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
  updatedAt: string;
}

const TYPE_LABEL: Record<PopupType, string> = {
  TEXT: "Texto",
  IMAGE: "Imagem",
  HTML: "HTML customizado",
};

const EMPTY_FORM = {
  type: "TEXT" as PopupType,
  title: "",
  body: "",
  imageUrl: null as string | null,
  linkUrl: "",
};

export function PopupManager({ popups: initialPopups }: { popups: Popup[] }) {
  const router = useRouter();
  const [popups, setPopups] = useState(initialPopups);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  function refresh() {
    router.refresh();
    fetch("/api/admin/popups")
      .then((r) => r.json())
      .then((d) => setPopups(d.popups ?? []));
  }

  return (
    <div className="wrap">
      {!creating && (
        <Button onClick={() => setCreating(true)}>+ Novo pop-up</Button>
      )}

      {creating && (
        <div className="card">
          <PopupFormFields
            initial={EMPTY_FORM}
            onCancel={() => setCreating(false)}
            onSave={async (form) => {
              await fetch("/api/admin/popups", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
              });
              setCreating(false);
              refresh();
            }}
            saveLabel="Criar pop-up"
          />
        </div>
      )}

      <div className="list">
        {popups.map((popup) => (
          <div key={popup.id} className="card">
            {editingId === popup.id ? (
              <PopupFormFields
                initial={{
                  type: popup.type,
                  title: popup.title ?? "",
                  body: popup.body ?? "",
                  imageUrl: popup.imageUrl,
                  linkUrl: popup.linkUrl ?? "",
                }}
                onCancel={() => setEditingId(null)}
                onSave={async (form) => {
                  await fetch(`/api/admin/popups/${popup.id}`, {
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
              <PopupRow
                popup={popup}
                onEdit={() => setEditingId(popup.id)}
                onToggleActive={async () => {
                  await fetch(`/api/admin/popups/${popup.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ active: !popup.active }),
                  });
                  refresh();
                }}
                onDelete={async () => {
                  if (!confirm("Excluir este pop-up? Essa ação não pode ser desfeita.")) return;
                  await fetch(`/api/admin/popups/${popup.id}`, { method: "DELETE" });
                  refresh();
                }}
              />
            )}
          </div>
        ))}
        {popups.length === 0 && !creating && (
          <p className="empty">Nenhum pop-up criado ainda.</p>
        )}
      </div>

      <style jsx>{`
        .wrap {
          max-width: 40rem;
        }
        .card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 0.75rem;
          padding: 1.1rem 1.25rem;
        }
        .list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-top: 1rem;
        }
        .empty {
          color: var(--text-muted);
          font-size: 0.9rem;
        }
      `}</style>
    </div>
  );
}

function PopupRow({
  popup,
  onEdit,
  onToggleActive,
  onDelete,
}: {
  popup: Popup;
  onEdit: () => void;
  onToggleActive: () => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  const preview =
    popup.type === "TEXT"
      ? popup.title || popup.body || "(sem conteúdo)"
      : popup.type === "IMAGE"
      ? popup.title || "Imagem"
      : "Bloco de HTML customizado";

  return (
    <div className="row">
      <div className="info">
        <div className="badges">
          <span className="type-badge">{TYPE_LABEL[popup.type]}</span>
          {popup.active && <span className="active-badge">● Ativo</span>}
        </div>
        <p className="preview">{preview}</p>
      </div>
      <div className="actions">
        <button
          type="button"
          className={`toggle-btn ${popup.active ? "on" : ""}`}
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await onToggleActive();
            setBusy(false);
          }}
        >
          {popup.active ? "Desativar" : "Ativar"}
        </button>
        <button type="button" className="edit-btn" onClick={onEdit}>
          ✏️ Editar
        </button>
        <button
          type="button"
          className="delete-btn"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await onDelete();
            setBusy(false);
          }}
        >
          Excluir
        </button>
      </div>
      <style jsx>{`
        .row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .info {
          min-width: 0;
          flex: 1;
        }
        .badges {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.4rem;
        }
        .type-badge {
          font-size: 0.72rem;
          font-weight: 600;
          background: var(--bg);
          border-radius: 999px;
          padding: 0.15rem 0.6rem;
          color: var(--text-muted);
        }
        .active-badge {
          font-size: 0.72rem;
          font-weight: 600;
          color: #16a34a;
        }
        .preview {
          margin: 0;
          font-size: 0.88rem;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .actions {
          display: flex;
          gap: 0.5rem;
          flex-shrink: 0;
        }
        .toggle-btn,
        .edit-btn,
        .delete-btn {
          font-size: 0.78rem;
          font-weight: 600;
          padding: 0.4rem 0.8rem;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: none;
          color: var(--text-muted);
          cursor: pointer;
        }
        .toggle-btn:hover,
        .edit-btn:hover {
          border-color: var(--indigo-600);
          color: var(--text);
        }
        .toggle-btn.on {
          background: #16a34a;
          border-color: #16a34a;
          color: white;
        }
        .delete-btn {
          color: #c0392b;
        }
        .delete-btn:hover {
          border-color: #c0392b;
        }
      `}</style>
    </div>
  );
}

function PopupFormFields({
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

  const canSave =
    form.type === "TEXT"
      ? form.body.trim().length > 0
      : form.type === "IMAGE"
      ? !!form.imageUrl
      : form.body.trim().length > 0;

  return (
    <div>
      <Field label="Tipo de conteúdo">
        <select
          value={form.type}
          onChange={(e) => setForm({ ...form, type: e.target.value as PopupType })}
        >
          <option value="TEXT">Texto</option>
          <option value="IMAGE">Imagem</option>
          <option value="HTML">HTML customizado</option>
        </select>
      </Field>

      {form.type !== "HTML" && (
        <Field label="Título" hint="Opcional">
          <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        </Field>
      )}

      {form.type === "TEXT" && (
        <Field label="Texto do aviso" required>
          <textarea
            className="textarea"
            rows={4}
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            placeholder="Ex: Estamos com um novo sorteio rolando! Confira em Meus Eventos."
          />
        </Field>
      )}

      {form.type === "IMAGE" && (
        <ImageUpload
          label="Imagem do pop-up"
          value={form.imageUrl}
          onChange={(url) => setForm({ ...form, imageUrl: url })}
          folder="popup-images"
          aspectRatio="16 / 9"
        />
      )}

      {form.type === "HTML" && (
        <Field
          label="HTML customizado"
          required
          hint="Renderizado exatamente como escrito - só cole HTML de fontes em que você confia."
        >
          <textarea
            className="textarea code"
            rows={8}
            value={form.body}
            onChange={(e) => setForm({ ...form, body: e.target.value })}
            placeholder="<div style='text-align:center'>...</div>"
          />
        </Field>
      )}

      <Field
        label="Link ao clicar"
        hint="Opcional. Se preenchido, o pop-up inteiro vira um link clicável."
      >
        <Input
          placeholder="https://..."
          value={form.linkUrl}
          onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
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
        select {
          width: 100%;
          padding: 0.6rem 0.7rem;
          border-radius: 0.5rem;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--text);
        }
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
        .textarea.code {
          font-family: var(--font-mono, monospace);
          font-size: 0.82rem;
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
