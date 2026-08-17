"use client";

import { useState } from "react";
import { Field, Input } from "@/components/ui/primitives";
import { ImageUpload } from "@/components/admin/ImageUpload";

type PopupType = "TEXT" | "IMAGE" | "HTML";

export interface LosePopupData {
  active: boolean;
  type: PopupType;
  title: string | null;
  body: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
}

const EMPTY: LosePopupData = {
  active: false,
  type: "TEXT",
  title: null,
  body: null,
  imageUrl: null,
  linkUrl: null,
};

/**
 * Shown to whoever DIDN'T win this prize, right when the draw reveals -
 * same content shape (type/title/body/imageUrl/linkUrl) as the global
 * pop-up on Meus Eventos, but scoped to this one prize. Typical use: a
 * consolation offer with a link, e.g. an upgrade pitch.
 */
export function PrizeLosePopupEditor({
  prizeId,
  initial,
}: {
  prizeId: string;
  initial: LosePopupData | null;
}) {
  const [form, setForm] = useState<LosePopupData>(initial ?? EMPTY);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/prizes/${prizeId}/lose-popup`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Não foi possível salvar o pop-up.");
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  return (
    <div className="wrap">
      <label className="active-row">
        <input
          type="checkbox"
          checked={form.active}
          onChange={(e) => setForm({ ...form, active: e.target.checked })}
        />
        <span>
          <strong>🎁 Mostrar pop-up para quem não ganhou</strong>
          <small>
            Aparece assim que o sorteio revela o resultado, só pra quem não foi o vencedor. Bom
            pra ofertas de consolação, como um upgrade de ingresso.
          </small>
        </span>
      </label>

      {form.active && (
        <div className="fields">
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
              <Input
                value={form.title ?? ""}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
              />
            </Field>
          )}

          {form.type === "TEXT" && (
            <Field label="Texto" required>
              <textarea
                className="textarea"
                rows={3}
                value={form.body ?? ""}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
                placeholder="Ex: Quer um upgrade no seu ingresso? Veja como melhorar sua experiência no show."
              />
            </Field>
          )}

          {form.type === "IMAGE" && (
            <>
              <ImageUpload
                label="Imagem"
                value={form.imageUrl}
                onChange={(url) => setForm({ ...form, imageUrl: url })}
                folder="prize-lose-popup"
                aspectRatio="16 / 9"
              />
              <Field label="Descrição" hint="Opcional. Aparece abaixo do título.">
                <textarea
                  className="textarea"
                  rows={3}
                  value={form.body ?? ""}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                />
              </Field>
            </>
          )}

          {form.type === "HTML" && (
            <Field
              label="HTML customizado"
              required
              hint="Renderizado exatamente como escrito - só cole HTML de fontes em que você confia."
            >
              <textarea
                className="textarea code"
                rows={6}
                value={form.body ?? ""}
                onChange={(e) => setForm({ ...form, body: e.target.value })}
              />
            </Field>
          )}

          <Field label="Link ao clicar" hint="Opcional. Se preenchido, o pop-up inteiro vira um link clicável.">
            <Input
              placeholder="https://..."
              value={form.linkUrl ?? ""}
              onChange={(e) => setForm({ ...form, linkUrl: e.target.value })}
            />
          </Field>
        </div>
      )}

      {error && <p className="error">{error}</p>}

      <div className="save-row">
        <button type="button" className="save-btn" onClick={save} disabled={saving}>
          {saving ? "Salvando…" : "Salvar pop-up pós-sorteio"}
        </button>
        {saved && <span className="saved-tag">Salvo ✓</span>}
      </div>

      <style jsx>{`
        .wrap {
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 0.6rem;
          padding: 1rem 1.1rem;
          margin-top: 0.5rem;
        }
        .active-row {
          display: flex;
          align-items: flex-start;
          gap: 0.65rem;
          cursor: pointer;
        }
        .active-row input {
          margin-top: 0.2rem;
          flex-shrink: 0;
        }
        .active-row span {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
        }
        .active-row small {
          color: var(--text-muted);
          font-size: 0.8rem;
        }
        .fields {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border);
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }
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
        .error {
          color: #c0392b;
          font-size: 0.82rem;
          margin-top: 0.75rem;
        }
        .save-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-top: 1rem;
        }
        .save-btn {
          background: var(--indigo-600);
          color: white;
          border: none;
          border-radius: 999px;
          padding: 0.5rem 1.1rem;
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
        }
        .save-btn:disabled {
          opacity: 0.6;
          cursor: default;
        }
        .saved-tag {
          font-size: 0.78rem;
          color: #16a34a;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
