"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Field, Input } from "@/components/ui/primitives";

interface ExperienceRow {
  id: string;
  slug: string;
  name: string;
  subtitle: string | null;
  active: boolean;
  eventCount: number;
  theme?: { primaryColor?: string; secondaryColor?: string } | null;
}

function slugify(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function ExperienceManager({ experiences: initial }: { experiences: ExperienceRow[] }) {
  const router = useRouter();
  const [experiences, setExperiences] = useState(initial);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    router.refresh();
    fetch("/api/admin/experiences")
      .then((r) => r.json())
      .then((d) =>
        setExperiences(
          (d.experiences ?? []).map((e: any) => ({
            id: e.id,
            slug: e.slug,
            name: e.name,
            subtitle: e.subtitle,
            active: e.active,
            eventCount: e._count?.events ?? 0,
            theme: e.theme ?? null,
          }))
        )
      );
  }

  async function create() {
    setError(null);
    if (!name.trim() || !slug.trim()) {
      setError("Preencha nome e slug.");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/admin/experiences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), slug: slug.trim() }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Não deu pra criar a experiência.");
      return;
    }
    setCreating(false);
    setName("");
    setSlug("");
    setSlugTouched(false);
    refresh();
  }

  return (
    <div className="wrap">
      {!creating && <Button onClick={() => setCreating(true)}>+ Nova experiência</Button>}

      {creating && (
        <div className="card form">
          <Field label="Nome" required hint="Ex: BTS - Turnê Memórias Póstumas">
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!slugTouched) setSlug(slugify(e.target.value));
              }}
              placeholder="Ex: BTS - Turnê Memórias Póstumas"
            />
          </Field>
          <Field label="Slug" required hint="Usado na URL da experiência - só letras minúsculas, números e hífen.">
            <Input
              value={slug}
              onChange={(e) => {
                setSlug(slugify(e.target.value));
                setSlugTouched(true);
              }}
              placeholder="bts-turne-memorias-postumas"
            />
          </Field>
          {error && <p className="error">{error}</p>}
          <div className="form-actions">
            <Button variant="ghost" onClick={() => setCreating(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={create} disabled={saving}>
              {saving ? "Criando…" : "Criar experiência"}
            </Button>
          </div>
        </div>
      )}

      <div className="list">
        {experiences.map((exp) => (
          <Link key={exp.id} href={`/admin/experiencias/${exp.id}`} className="row">
            <span
              className="swatch"
              style={{
                background: `linear-gradient(160deg, ${exp.theme?.primaryColor || "#3B55E6"}, ${
                  exp.theme?.secondaryColor || "#0c2a5b"
                })`,
              }}
            />
            <div className="info">
              <div className="badges">
                <span className={`vis-badge ${exp.active ? "live" : "draft"}`}>
                  {exp.active ? "Visível" : "Oculta"}
                </span>
              </div>
              <p className="name">{exp.name}</p>
              <p className="meta">
                {exp.subtitle ? `${exp.subtitle} · ` : ""}
                {exp.eventCount} {exp.eventCount === 1 ? "sorteio vinculado" : "sorteios vinculados"}
              </p>
            </div>
            <span className="arrow">Gerenciar →</span>
          </Link>
        ))}
        {experiences.length === 0 && !creating && (
          <p className="empty">
            Nenhuma experiência criada ainda. Sorteios sem experiência continuam aparecendo
            normalmente em Meus Eventos, avulsos.
          </p>
        )}
      </div>

      <style jsx>{`
        .wrap {
          max-width: 42rem;
        }
        .card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 0.75rem;
          padding: 1.1rem 1.25rem;
        }
        .form {
          margin-bottom: 1rem;
        }
        .error {
          color: #c0392b;
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
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 0.75rem;
          padding: 1rem 1.25rem;
          text-decoration: none;
          color: inherit;
        }
        .row:hover {
          border-color: var(--indigo-600);
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
        .vis-badge {
          font-size: 0.7rem;
          font-weight: 700;
          border-radius: 999px;
          padding: 0.15rem 0.6rem;
        }
        .vis-badge.draft {
          background: rgba(107, 114, 128, 0.15);
          color: #4b5563;
        }
        .vis-badge.live {
          background: rgba(22, 163, 74, 0.15);
          color: #16a34a;
        }
        .name {
          margin: 0 0 0.2rem;
          font-weight: 600;
        }
        .meta {
          margin: 0;
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .arrow {
          font-size: 0.8rem;
          font-weight: 600;
          color: var(--indigo-600);
          flex-shrink: 0;
        }
        .empty {
          color: var(--text-muted);
          font-size: 0.9rem;
          max-width: 30rem;
        }
      `}</style>
    </div>
  );
}
