"use client";

import { useState } from "react";
import { Button, Field, Input } from "@/components/ui/primitives";
import { ImageUpload } from "@/components/admin/ImageUpload";

type BlockType = "text" | "image" | "cardsGrid" | "cardsCarousel";

interface CardItem {
  id: string;
  imageUrl: string | null;
  title: string;
  description: string;
}

interface Block {
  id: string;
  type: BlockType;
  title?: string;
  body?: string;
  imageUrl?: string | null;
  caption?: string;
  cards?: CardItem[];
  columns?: number; // cardsGrid: quantas colunas fixas
  visibleCount?: number; // cardsCarousel: quantos cards aparecem por vez
  autoplay?: boolean; // cardsCarousel: avança sozinho devagar
}

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Blocos salvos antes de "Cards" virar "Grade de Cards"/"Carrossel de
 * Cards" ainda têm type:"cards" no banco - sem isso, tanto o editor
 * (TYPE_LABELS[block.type] undefined) quanto a página pública quebram
 * pra quem já tinha criado algum. Trata como Grade, mantendo os cards
 * que já existiam.
 */
function normalizeBlock(b: Block): Block {
  if ((b as any).type === "cards") {
    return { ...b, type: "cardsGrid", columns: b.columns ?? 4 };
  }
  return b;
}

const TYPE_LABELS: Record<BlockType, { label: string; icon: string }> = {
  text: { label: "Texto", icon: "📝" },
  image: { label: "Imagem", icon: "🖼️" },
  cardsGrid: { label: "Grade de Cards", icon: "🗂️" },
  cardsCarousel: { label: "Carrossel de Cards", icon: "🎠" },
};

export function LpBlocksEditor({
  eventId,
  initialBlocks,
}: {
  eventId: string;
  initialBlocks: Block[];
}) {
  const [blocks, setBlocks] = useState<Block[]>((initialBlocks ?? []).map(normalizeBlock));
  const [addingType, setAddingType] = useState<BlockType | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addBlock(type: BlockType) {
    const base: Block = { id: uid(), type };
    if (type === "text") {
      base.title = "";
      base.body = "";
    } else if (type === "image") {
      base.imageUrl = null;
      base.caption = "";
    } else if (type === "cardsGrid") {
      base.columns = 4;
      base.cards = [{ id: uid(), imageUrl: null, title: "", description: "" }];
    } else {
      base.visibleCount = 3;
      base.autoplay = false;
      base.cards = [{ id: uid(), imageUrl: null, title: "", description: "" }];
    }
    setBlocks((b) => [...b, base]);
    setAddingType(null);
  }

  function updateBlock(id: string, patch: Partial<Block>) {
    setBlocks((b) => b.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  }

  function removeBlock(id: string) {
    setBlocks((b) => b.filter((x) => x.id !== id));
  }

  function moveBlock(id: string, dir: -1 | 1) {
    setBlocks((b) => {
      const i = b.findIndex((x) => x.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= b.length) return b;
      const next = [...b];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

  function addCard(blockId: string) {
    setBlocks((b) =>
      b.map((x) =>
        x.id === blockId
          ? { ...x, cards: [...(x.cards ?? []), { id: uid(), imageUrl: null, title: "", description: "" }] }
          : x
      )
    );
  }

  function updateCard(blockId: string, cardId: string, patch: Partial<CardItem>) {
    setBlocks((b) =>
      b.map((x) =>
        x.id === blockId
          ? { ...x, cards: (x.cards ?? []).map((c) => (c.id === cardId ? { ...c, ...patch } : c)) }
          : x
      )
    );
  }

  function removeCard(blockId: string, cardId: string) {
    setBlocks((b) =>
      b.map((x) => (x.id === blockId ? { ...x, cards: (x.cards ?? []).filter((c) => c.id !== cardId) } : x))
    );
  }

  async function save() {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/events/${eventId}/lp-blocks`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ blocks }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Não foi possível salvar.");
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  return (
    <div className="wrap">
      {blocks.length === 0 && <p className="empty">Nenhum bloco ainda — adicione o primeiro abaixo.</p>}

      <div className="blocks">
        {blocks.map((block, i) => (
          <div key={block.id} className="block-card">
            <div className="block-head">
              <span className="block-type">
                {TYPE_LABELS[block.type].icon} {TYPE_LABELS[block.type].label}
              </span>
              <div className="block-controls">
                <button type="button" onClick={() => moveBlock(block.id, -1)} disabled={i === 0}>
                  ↑
                </button>
                <button type="button" onClick={() => moveBlock(block.id, 1)} disabled={i === blocks.length - 1}>
                  ↓
                </button>
                <button type="button" className="remove-btn" onClick={() => removeBlock(block.id)}>
                  Excluir
                </button>
              </div>
            </div>

            {block.type === "text" && (
              <div className="block-body">
                <Field label="Título" hint="Opcional">
                  <Input
                    value={block.title ?? ""}
                    onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                  />
                </Field>
                <Field label="Texto">
                  <textarea
                    className="textarea"
                    rows={4}
                    value={block.body ?? ""}
                    onChange={(e) => updateBlock(block.id, { body: e.target.value })}
                  />
                </Field>
              </div>
            )}

            {block.type === "image" && (
              <div className="block-body">
                <ImageUpload
                  label="Imagem"
                  value={block.imageUrl ?? null}
                  onChange={(url) => updateBlock(block.id, { imageUrl: url })}
                  folder="lp-blocks"
                  aspectRatio="16 / 9"
                />
                <Field label="Legenda" hint="Opcional">
                  <Input
                    value={block.caption ?? ""}
                    onChange={(e) => updateBlock(block.id, { caption: e.target.value })}
                  />
                </Field>
              </div>
            )}

            {(block.type === "cardsGrid" || block.type === "cardsCarousel") && (
              <div className="block-body">
                {block.type === "cardsGrid" && (
                  <Field label="Colunas fixas" hint="De 2 a 10 por linha. Em telas estreitas, ajusta sozinho.">
                    <select
                      className="select"
                      value={block.columns ?? 4}
                      onChange={(e) => updateBlock(block.id, { columns: Number(e.target.value) })}
                    >
                      {Array.from({ length: 9 }, (_, i) => i + 2).map((n) => (
                        <option key={n} value={n}>
                          {n} colunas
                        </option>
                      ))}
                    </select>
                  </Field>
                )}

                {block.type === "cardsCarousel" && (
                  <>
                    <Field label="Cards visíveis por vez" hint="De 1 a 6. Pode adicionar quantos cards quiser abaixo - o resto rola.">
                      <select
                        className="select"
                        value={block.visibleCount ?? 3}
                        onChange={(e) => updateBlock(block.id, { visibleCount: Number(e.target.value) })}
                      >
                        {[1, 2, 3, 4, 5, 6].map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <label className="autoplay-row">
                      <input
                        type="checkbox"
                        checked={block.autoplay ?? false}
                        onChange={(e) => updateBlock(block.id, { autoplay: e.target.checked })}
                      />
                      <span>
                        <strong>▶️ Avançar automaticamente</strong>
                        <small>Passa sozinho devagar. A pessoa também pode arrastar/clicar pros lados a qualquer momento.</small>
                      </span>
                    </label>
                  </>
                )}

                {(block.cards ?? []).map((card) => (
                  <div key={card.id} className="card-editor">
                    <ImageUpload
                      label="Foto do card"
                      value={card.imageUrl}
                      onChange={(url) => updateCard(block.id, card.id, { imageUrl: url })}
                      folder="lp-blocks"
                      aspectRatio="4 / 3"
                    />
                    <Field label="Título do card">
                      <Input
                        value={card.title}
                        onChange={(e) => updateCard(block.id, card.id, { title: e.target.value })}
                      />
                    </Field>
                    <Field label="Descrição" hint="Opcional">
                      <Input
                        value={card.description}
                        onChange={(e) => updateCard(block.id, card.id, { description: e.target.value })}
                      />
                    </Field>
                    <button
                      type="button"
                      className="remove-card-btn"
                      onClick={() => removeCard(block.id, card.id)}
                    >
                      Remover este card
                    </button>
                  </div>
                ))}
                <Button variant="ghost" onClick={() => addCard(block.id)}>
                  + Adicionar card
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {addingType ? (
        <div className="type-picker">
          {(Object.keys(TYPE_LABELS) as BlockType[]).map((t) => (
            <button key={t} type="button" className="type-option" onClick={() => addBlock(t)}>
              {TYPE_LABELS[t].icon} {TYPE_LABELS[t].label}
            </button>
          ))}
          <button type="button" className="type-option cancel" onClick={() => setAddingType(null)}>
            Cancelar
          </button>
        </div>
      ) : (
        <Button variant="ghost" onClick={() => setAddingType("text")}>
          + Adicionar bloco
        </Button>
      )}

      {error && <p className="error">{error}</p>}

      <div className="save-row">
        <Button onClick={save} disabled={saving}>
          {saving ? "Salvando…" : "Salvar LP"}
        </Button>
        {saved && <span className="saved-tag">Salvo ✓</span>}
      </div>

      <style jsx>{`
        .wrap {
          max-width: 40rem;
        }
        .empty {
          color: var(--text-muted);
          font-size: 0.9rem;
          margin-bottom: 1rem;
        }
        .blocks {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          margin-bottom: 1rem;
        }
        .block-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 0.85rem;
          padding: 1.1rem;
        }
        .block-head {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.9rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid var(--border);
        }
        .block-type {
          font-size: 0.82rem;
          font-weight: 700;
          color: var(--text-muted);
        }
        .block-controls {
          display: flex;
          gap: 0.4rem;
        }
        .block-controls button {
          font-size: 0.8rem;
          padding: 0.3rem 0.6rem;
          border-radius: 0.4rem;
          border: 1px solid var(--border);
          background: var(--bg);
          cursor: pointer;
        }
        .block-controls button:disabled {
          opacity: 0.4;
          cursor: default;
        }
        .remove-btn {
          color: #c0392b !important;
        }
        .block-body {
          display: flex;
          flex-direction: column;
          gap: 0.85rem;
        }
        .card-editor {
          border: 1px dashed var(--border);
          border-radius: 0.6rem;
          padding: 0.85rem;
          margin-bottom: 0.75rem;
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }
        .remove-card-btn {
          align-self: flex-start;
          font-size: 0.78rem;
          color: #c0392b;
          background: none;
          border: none;
          cursor: pointer;
        }
        .select {
          width: 100%;
          box-sizing: border-box;
          padding: 0.6rem 0.8rem;
          border-radius: 0.5rem;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--text);
          font-family: inherit;
          font-size: 0.9rem;
        }
        .autoplay-row {
          display: flex;
          align-items: flex-start;
          gap: 0.6rem;
          padding: 0.75rem 0.9rem;
          background: var(--bg);
          border-radius: 0.5rem;
          cursor: pointer;
        }
        .autoplay-row input {
          margin-top: 0.2rem;
        }
        .autoplay-row span {
          display: flex;
          flex-direction: column;
          gap: 0.1rem;
        }
        .autoplay-row small {
          color: var(--text-muted);
          font-size: 0.78rem;
        }
        .textarea {
          width: 100%;
          box-sizing: border-box;
          padding: 0.7rem 0.9rem;
          border-radius: 0.6rem;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--text);
          font-family: inherit;
          font-size: 0.9rem;
          resize: vertical;
        }
        .type-picker {
          display: flex;
          gap: 0.6rem;
          flex-wrap: wrap;
          margin-bottom: 1rem;
        }
        .type-option {
          padding: 0.6rem 1rem;
          border-radius: 0.6rem;
          border: 1px solid var(--border);
          background: var(--surface);
          cursor: pointer;
          font-size: 0.88rem;
        }
        .type-option.cancel {
          color: var(--text-muted);
        }
        .error {
          color: #c0392b;
          font-size: 0.85rem;
          margin: 0.5rem 0 0;
        }
        .save-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid var(--border);
        }
        .saved-tag {
          font-size: 0.82rem;
          color: #16a34a;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
