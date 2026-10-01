"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input } from "@/components/ui/primitives";
import { ImageUpload } from "@/components/admin/ImageUpload";

type Engine = "WORLD" | "MAZE" | "BLAST" | "CITYRUN";
type Visibility = "DRAFT" | "TESTING" | "LIVE";

interface UniverseGameRow {
  id: string;
  eventId: string;
  eventName: string;
  engine: Engine;
  slug: string;
  title: string;
  description: string;
  tag: string;
  coverImageUrl: string | null;
  order: number;
  visibility: Visibility;
}

const ENGINE_LABEL: Record<Engine, string> = {
  WORLD: "Plataforma (AS World Adventure)",
  MAZE: "Labirinto (AS Neon Maze)",
  BLAST: "Bombas (AS Blast Arena)",
  CITYRUN: "Corrida na cidade (AS City Run)",
};

const VISIBILITY_LABEL: Record<Visibility, string> = {
  DRAFT: "Rascunho",
  TESTING: "Teste",
  LIVE: "Ao vivo",
};
const VIS_BADGE_CLASS: Record<Visibility, string> = {
  DRAFT: "",
  TESTING: "as-badge-warning",
  LIVE: "as-badge-success",
};

function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

const EMPTY_FORM = {
  eventId: "",
  engine: "WORLD" as Engine,
  title: "",
  slug: "",
  description: "",
  tag: "",
  coverImageUrl: null as string | null,
  order: 0,
};

function formFromGame(game: UniverseGameRow) {
  return {
    eventId: game.eventId,
    engine: game.engine,
    title: game.title,
    slug: game.slug,
    description: game.description,
    tag: game.tag,
    coverImageUrl: game.coverImageUrl,
    order: game.order,
  };
}

/**
 * Catálogo do hub Universo AS (/e/[slug]/arcade) por evento - molde direto
 * de GameManager.tsx, mas cada entrada é um "motor" existente (WORLD/MAZE/
 * BLAST/CITYRUN) recebendo capa, título, descrição e evento próprios, em
 * vez de um jogo novo de verdade.
 */
export function UniverseGameManager({
  games: initialGames,
  events,
}: {
  games: UniverseGameRow[];
  events: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [games, setGames] = useState(initialGames);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingVisibilityId, setSavingVisibilityId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    router.refresh();
    fetch("/api/admin/universe-games")
      .then((r) => r.json())
      .then((d) =>
        setGames(
          (d.games ?? []).map((g: any) => ({
            id: g.id,
            eventId: g.eventId,
            eventName: g.event?.name ?? "",
            engine: g.engine,
            slug: g.slug,
            title: g.title,
            description: g.description,
            tag: g.tag,
            coverImageUrl: g.coverImageUrl,
            order: g.order,
            visibility: g.visibility,
          }))
        )
      );
  }

  async function updateVisibility(id: string, visibility: Visibility) {
    setError(null);
    setSavingVisibilityId(id);
    const res = await fetch(`/api/admin/universe-games/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visibility }),
    });
    setSavingVisibilityId(null);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setError(b.error || "Não deu pra salvar.");
      return;
    }
    setGames((gs) => gs.map((g) => (g.id === id ? { ...g, visibility } : g)));
  }

  return (
    <div className="wrap">
      <div className="section-header">
        <p className="section-title">Jogos do Universo AS</p>
        {!creating && <Button onClick={() => setCreating(true)}>+ Novo jogo no catálogo</Button>}
      </div>
      <p className="hint">
        Cada entrada ativa um dos 4 motores de jogo já construídos pra um evento específico, com
        capa, título e descrição próprios. Pra pedir um motor novo (mecânica diferente), isso ainda
        precisa ser construído à parte.
      </p>
      {error && <p className="error">{error}</p>}

      {creating && (
        <div className="as-card form">
          <GameFormFields
            initial={{ ...EMPTY_FORM, eventId: events[0]?.id ?? "" }}
            events={events}
            onCancel={() => setCreating(false)}
            onSave={async (form) => {
              const res = await fetch("/api/admin/universe-games", {
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
            saveLabel="Criar"
          />
        </div>
      )}

      <div className="list">
        {games.map((game) => (
          <div key={game.id} className="as-card row">
            {editingId === game.id ? (
              <GameFormFields
                initial={formFromGame(game)}
                events={events}
                onCancel={() => setEditingId(null)}
                onSave={async (form) => {
                  const res = await fetch(`/api/admin/universe-games/${game.id}`, {
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
              <>
                {game.coverImageUrl ? (
                  <img src={game.coverImageUrl} alt="" className="cover" />
                ) : (
                  <div className="cover placeholder">🕹️</div>
                )}
                <div className="info">
                  <div className="badges">
                    <span className={`as-badge ${VIS_BADGE_CLASS[game.visibility]}`}>
                      {VISIBILITY_LABEL[game.visibility]}
                    </span>
                    <span className="as-badge">{ENGINE_LABEL[game.engine]}</span>
                  </div>
                  <p className="name">{game.title}</p>
                  <p className="meta">{game.eventName}</p>
                </div>
                <div className="actions">
                  <select
                    className="as-select"
                    value={game.visibility}
                    disabled={savingVisibilityId === game.id}
                    onChange={(e) => updateVisibility(game.id, e.target.value as Visibility)}
                  >
                    <option value="DRAFT">Rascunho</option>
                    <option value="TESTING">Teste</option>
                    <option value="LIVE">Ao vivo</option>
                  </select>
                  <button type="button" className="edit-btn" onClick={() => setEditingId(game.id)}>
                    ✏️ Editar
                  </button>
                  <button
                    type="button"
                    className="delete-btn"
                    onClick={async () => {
                      if (!confirm(`Excluir "${game.title}" do catálogo do Universo AS?`)) return;
                      await fetch(`/api/admin/universe-games/${game.id}`, { method: "DELETE" });
                      refresh();
                    }}
                  >
                    Excluir
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
        {games.length === 0 && !creating && (
          <p className="empty">Nenhum jogo do Universo AS cadastrado ainda.</p>
        )}
      </div>

      <style jsx>{`
        .wrap {
          max-width: 56rem;
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
        .list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .row {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem 1.25rem;
        }
        .cover {
          width: 4.5rem;
          height: 4.5rem;
          object-fit: cover;
          border-radius: 0.6rem;
          flex-shrink: 0;
        }
        .cover.placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.6rem;
          background: var(--bg);
        }
        .info {
          min-width: 0;
          flex: 1;
        }
        .badges {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
          margin-bottom: 0.4rem;
        }
        .name {
          margin: 0 0 0.2rem;
          font-weight: 600;
        }
        .meta {
          margin: 0;
          font-size: 0.8rem;
          color: var(--as-muted, var(--text-muted));
        }
        .actions {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-shrink: 0;
        }
        select {
          min-width: 8rem;
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
          white-space: nowrap;
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

function GameFormFields({
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
  const [slugTouched, setSlugTouched] = useState(true);
  const [saving, setSaving] = useState(false);

  const canSave = Boolean(form.eventId && form.title.trim() && form.slug.trim());

  return (
    <div>
      <Field label="Evento" required hint="Esse jogo só aparece no hub desse evento.">
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
      <Field label="Motor do jogo" required>
        <select
          className="as-select"
          value={form.engine}
          onChange={(e) => setForm({ ...form, engine: e.target.value as Engine })}
        >
          {Object.entries(ENGINE_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Título exibido no card">
        <Input
          value={form.title}
          onChange={(e) => {
            const title = e.target.value;
            setForm((f) => ({ ...f, title, slug: slugTouched ? f.slug : slugify(title) }));
          }}
          placeholder="Ex: AS World Adventure"
        />
      </Field>
      <Field label="Slug" required hint="Só letras minúsculas, números e hífen. Precisa ser único.">
        <Input
          value={form.slug}
          onChange={(e) => {
            setForm({ ...form, slug: slugify(e.target.value) });
            setSlugTouched(true);
          }}
          placeholder="as-world-adventure-bts"
        />
      </Field>
      <Field label="Categoria (tag curta do card)" hint='Ex: "AVENTURA", "LABIRINTO", "ARENA", "RUNNER".'>
        <Input value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} />
      </Field>
      <Field label="Descrição curta">
        <textarea
          className="textarea"
          rows={2}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </Field>
      <ImageUpload
        label="Capa do jogo"
        value={form.coverImageUrl}
        onChange={(url) => setForm({ ...form, coverImageUrl: url })}
        folder="universe-games"
        aspectRatio="16 / 10"
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
