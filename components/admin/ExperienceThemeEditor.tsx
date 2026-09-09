"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input } from "@/components/ui/primitives";
import { ImageUpload } from "@/components/admin/ImageUpload";

interface ExperienceTheme {
  primaryColor?: string;
  secondaryColor?: string;
  backgroundImageUrl?: string | null;
}

const DEFAULT_THEME: Required<ExperienceTheme> = {
  primaryColor: "#3B55E6",
  secondaryColor: "#0c2a5b",
  backgroundImageUrl: null,
};

export function ExperienceThemeEditor({
  experienceId,
  name: initialName,
  subtitle: initialSubtitle,
  description: initialDescription,
  active: initialActive,
  theme: initialTheme,
}: {
  experienceId: string;
  name: string;
  subtitle: string | null;
  description: string | null;
  active: boolean;
  theme: ExperienceTheme | null;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [subtitle, setSubtitle] = useState(initialSubtitle ?? "");
  const [description, setDescription] = useState(initialDescription ?? "");
  const [active, setActive] = useState(initialActive);
  const [theme, setTheme] = useState<Required<ExperienceTheme>>({
    ...DEFAULT_THEME,
    ...(initialTheme ?? {}),
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setSaved(false);
    await fetch(`/api/admin/experiences/${experienceId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, subtitle, description, active, theme }),
    });
    setSaving(false);
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="card">
      <p className="section-title">Página da experiência</p>
      <p className="hint-text">
        Nome, descrição e visual mostrados na página pública (banner de ponta a ponta na home +
        landing page própria) e no card do Universo AS.
      </p>

      <Field label="Nome">
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Subtítulo" hint="Curto, aparece embaixo do nome no banner e no card.">
        <Input value={subtitle} onChange={(e) => setSubtitle(e.target.value)} placeholder="Ex: Show internacional · 25/09/2026" />
      </Field>
      <Field label="Descrição" hint="Texto livre mostrado na landing page da experiência.">
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={4}
          className="textarea"
        />
      </Field>

      <div className="fields">
        <Field label="Cor primária">
          <div className="color-row">
            <input
              type="color"
              value={theme.primaryColor}
              onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
            />
            <span className="color-value">{theme.primaryColor}</span>
          </div>
        </Field>
        <Field label="Cor secundária">
          <div className="color-row">
            <input
              type="color"
              value={theme.secondaryColor}
              onChange={(e) => setTheme({ ...theme, secondaryColor: e.target.value })}
            />
            <span className="color-value">{theme.secondaryColor}</span>
          </div>
        </Field>
      </div>

      <ImageUpload
        label="Imagem de fundo do banner"
        hint="Opcional - se não tiver, usa um degradê com as cores acima."
        value={theme.backgroundImageUrl}
        onChange={(url) => setTheme({ ...theme, backgroundImageUrl: url })}
        folder="experience-themes"
        aspectRatio="21 / 9"
      />

      <div
        className="preview"
        style={{
          background: theme.backgroundImageUrl
            ? `linear-gradient(0deg, rgba(0,0,0,.55), rgba(0,0,0,.05)), url(${theme.backgroundImageUrl}) center/cover`
            : `linear-gradient(160deg, ${theme.primaryColor}, ${theme.secondaryColor})`,
        }}
      >
        <span>{name || "Prévia do banner"}</span>
      </div>

      <label className="checkbox">
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
        Visível na home do participante
      </label>

      <div className="form-actions">
        <Button onClick={save} disabled={saving}>
          {saving ? "Salvando…" : "Salvar"}
        </Button>
        {saved && <span className="saved-badge">✓ Salvo</span>}
      </div>

      <style jsx>{`
        .card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 0.75rem;
          padding: 1.1rem 1.25rem;
          margin-bottom: 1.75rem;
        }
        .section-title {
          font-size: 0.85rem;
          font-weight: 700;
          margin: 0 0 0.3rem;
        }
        .hint-text {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin: 0 0 1rem;
          line-height: 1.5;
        }
        .textarea {
          width: 100%;
          padding: 0.7rem 0.9rem;
          border-radius: 0.6rem;
          border: 1px solid var(--border);
          font-size: 0.9rem;
          background: var(--surface);
          color: var(--text);
          font-family: inherit;
          resize: vertical;
        }
        .fields {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        .color-row {
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }
        input[type="color"] {
          width: 2.6rem;
          height: 2.6rem;
          padding: 0;
          border: 1px solid var(--border);
          border-radius: 0.5rem;
          cursor: pointer;
          background: none;
        }
        .color-value {
          font-size: 0.85rem;
          color: var(--text-muted);
          font-family: var(--font-mono, monospace);
        }
        .preview {
          height: 6rem;
          border-radius: 0.6rem;
          display: flex;
          align-items: flex-end;
          padding: 0.75rem 1rem;
          margin: 1rem 0;
        }
        .preview span {
          color: white;
          font-size: 0.85rem;
          font-weight: 700;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
        }
        .checkbox {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.85rem;
          margin-bottom: 1rem;
        }
        .form-actions {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }
        .saved-badge {
          color: #16a34a;
          font-size: 0.85rem;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
