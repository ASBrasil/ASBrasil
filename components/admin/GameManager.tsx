"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Field, Input } from "@/components/ui/primitives";

type GameType =
  | "QUIZ"
  | "MEMORY"
  | "RHYTHM"
  | "HUNT"
  | "CARDS"
  | "REACTION"
  | "RUN"
  | "TICKET"
  | "PICK"
  | "WORLD"
  | "MAZE"
  | "BLAST"
  | "CITYRUN";
type GameVisibility = "DRAFT" | "TESTING" | "LIVE";

// Tipos que já têm um jogador de verdade construído (ver GamePlayer.tsx) -
// os outros existem no schema/admin mas ainda não são jogáveis, então ficam
// desabilitados no seletor até terem seu componente de jogador.
const PLAYABLE_TYPES: GameType[] = [
  "QUIZ",
  "REACTION",
  "MEMORY",
  "RUN",
  "TICKET",
  "PICK",
  "WORLD",
  "MAZE",
  "BLAST",
  "CITYRUN",
];

interface GameRow {
  id: string;
  slug: string;
  name: string;
  type: GameType;
  visibility: GameVisibility;
  eventName: string;
  phaseCount: number;
  theme?: { primaryColor?: string; secondaryColor?: string } | null;
}

const TYPE_LABEL: Record<GameType, string> = {
  QUIZ: "Quiz",
  MEMORY: "Memória",
  RHYTHM: "Ritmo",
  HUNT: "Caça",
  CARDS: "Cards",
  REACTION: "Reação (Purple Reaction)",
  RUN: "Corrida (AS Run)",
  TICKET: "Ingressos (Ticket Rush)",
  PICK: "Precisão (Perfect Pick)",
  WORLD: "Plataforma (AS World Adventure)",
  MAZE: "Labirinto (AS Neon Maze)",
  BLAST: "Bombas (AS Blast Arena)",
  CITYRUN: "Corrida na cidade (AS City Run)",
};

const VISIBILITY_LABEL: Record<GameVisibility, string> = {
  DRAFT: "Rascunho",
  TESTING: "Teste",
  LIVE: "Ao vivo",
};

const VIS_BADGE_CLASS: Record<GameVisibility, string> = {
  DRAFT: "",
  TESTING: "as-badge-warning",
  LIVE: "as-badge-success",
};

function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function GameManager({
  games: initialGames,
  events,
}: {
  games: GameRow[];
  events: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [games, setGames] = useState(initialGames);
  const [creating, setCreating] = useState(false);
  const [eventId, setEventId] = useState(events[0]?.id ?? "");
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [type, setType] = useState<GameType>("QUIZ");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    router.refresh();
    fetch("/api/admin/games")
      .then((r) => r.json())
      .then((d) =>
        setGames(
          (d.games ?? []).map((g: any) => ({
            id: g.id,
            slug: g.slug,
            name: g.name,
            type: g.type,
            visibility: g.visibility,
            eventName: g.event?.name ?? "",
            phaseCount: g.phases?.length ?? 0,
            theme: g.theme ?? null,
          }))
        )
      );
  }

  async function createGame() {
    setError(null);
    if (!eventId) {
      setError("Escolha o sorteio do jogo.");
      return;
    }
    if (!name.trim() || !slug.trim()) {
      setError("Preencha nome e slug.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/admin/games", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventId, name: name.trim(), slug: slug.trim(), type }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Não deu pra criar o jogo.");
      return;
    }
    setCreating(false);
    setName("");
    setSlug("");
    setSlugTouched(false);
    setType("QUIZ");
    refresh();
  }

  return (
    <div className="wrap">
      {!creating && <Button onClick={() => setCreating(true)}>+ Novo jogo</Button>}

      {creating && (
        <div className="as-card form">
          <Field label="Sorteio" required hint="O jogo fica sempre amarrado a um sorteio.">
            <select className="as-select" value={eventId} onChange={(e) => setEventId(e.target.value)}>
              {events.length === 0 && <option value="">Nenhum sorteio cadastrado</option>}
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Nome do jogo" required>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slugTouched) setSlug(slugify(e.target.value));
              }}
              placeholder="Ex: Quiz AS Brasil"
            />
          </Field>
          <Field label="Slug" required hint="Usado na URL do jogo - só letras minúsculas, números e hífen.">
            <Input
              value={slug}
              onChange={(e) => {
                setSlug(slugify(e.target.value));
                setSlugTouched(true);
              }}
              placeholder="quiz-as-brasil"
            />
          </Field>
          <Field label="Tipo">
            <select className="as-select" value={type} onChange={(e) => setType(e.target.value as GameType)}>
              {Object.entries(TYPE_LABEL).map(([value, label]) => {
                const playable = PLAYABLE_TYPES.includes(value as GameType);
                return (
                  <option key={value} value={value} disabled={!playable}>
                    {label}
                    {!playable ? " (em breve)" : ""}
                  </option>
                );
              })}
            </select>
          </Field>
          {error && <p className="error">{error}</p>}
          <div className="form-actions">
            <Button variant="ghost" onClick={() => setCreating(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={createGame} disabled={saving}>
              {saving ? "Criando…" : "Criar jogo"}
            </Button>
          </div>
        </div>
      )}

      <div className="list">
        {games.map((game) => (
          <Link key={game.id} href={`/admin/jogos/${game.id}`} className="as-card as-card-hover row">
            <span
              className="swatch"
              style={{
                background: `linear-gradient(160deg, ${game.theme?.primaryColor || "#4f5fff"}, ${
                  game.theme?.secondaryColor || "#0a1330"
                })`,
              }}
            />
            <div className="info">
              <div className="badges">
                <span className={`as-badge ${VIS_BADGE_CLASS[game.visibility]}`}>
                  {VISIBILITY_LABEL[game.visibility]}
                </span>
                <span className="as-badge">{TYPE_LABEL[game.type]}</span>
              </div>
              <p className="name">{game.name}</p>
              <p className="meta">
                {game.eventName} · {game.phaseCount} {game.phaseCount === 1 ? "fase" : "fases"}
              </p>
            </div>
            <span className="arrow">Gerenciar →</span>
          </Link>
        ))}
        {games.length === 0 && !creating && <p className="empty">Nenhum jogo criado ainda.</p>}
      </div>

      <style jsx>{`
        .wrap {
          max-width: 42rem;
        }
        .form {
          padding: 1.1rem 1.25rem;
          margin-bottom: 1rem;
        }
        .error {
          color: var(--as-red, #c0392b);
          font-size: 0.85rem;
          margin: 0 0 0.75rem;
        }
        .form-actions {
          display: flex;
          gap: 0.6rem;
        }
        .list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-top: 1rem;
        }
        .row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 1rem;
          padding: 1rem 1.25rem;
          text-decoration: none;
          color: inherit;
        }
        .swatch {
          width: 0.5rem;
          align-self: stretch;
          border-radius: 999px;
          flex-shrink: 0;
        }
        .info {
          min-width: 0;
        }
        .badges {
          display: flex;
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
        .arrow {
          font-size: 0.8rem;
          font-weight: 700;
          color: var(--as-cyan, var(--indigo-600));
          flex-shrink: 0;
        }
        .empty {
          color: var(--as-muted, var(--text-muted));
          font-size: 0.9rem;
        }
      `}</style>
    </div>
  );
}
