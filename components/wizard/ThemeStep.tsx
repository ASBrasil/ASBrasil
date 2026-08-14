"use client";

import { useState } from "react";
import { Button, Field, Input, Card } from "@/components/ui/primitives";
import { ImageUpload } from "@/components/admin/ImageUpload";

const PRESETS = [
  { name: "AS Brasil", primary: "#4F5FFF", background: "#0A1330", surface: "#141B3D", text: "#F5F6FA" },
  { name: "Dourado de gala", primary: "#E8B646", background: "#12121A", surface: "#1B1B26", text: "#F5F0E6" },
  { name: "Clean claro", primary: "#2563EB", background: "#FFFFFF", surface: "#F3F4F6", text: "#0F172A" },
];

interface ThemeColors {
  name?: string;
  primary: string;
  background: string;
  surface: string;
  text: string;
}

export function ThemeStep({
  eventId,
  onDone,
  initialTheme,
}: {
  eventId: string;
  onDone: () => void;
  initialTheme?: { colors?: ThemeColors; customCss?: string; bannerUrl?: string | null } | null;
}) {
  const [colors, setColors] = useState<ThemeColors>(
    initialTheme?.colors ?? PRESETS[0]
  );
  const [customCss, setCustomCss] = useState(initialTheme?.customCss ?? "");
  const [bannerUrl, setBannerUrl] = useState<string | null>(initialTheme?.bannerUrl ?? null);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    await fetch(`/api/admin/events/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        theme: { colors: { ...colors }, customCss: customCss || undefined, bannerUrl: bannerUrl || undefined },
      }),
    });
    setSaving(false);
    onDone();
  }

  return (
    <Card icon="🎨">
      <h2>Dê a cara do evento à campanha</h2>
      <p className="subtitle">
        Essas cores e o banner aparecem na página pública, no painel do participante e nos e-mails.
      </p>

      <ImageUpload
        label="Banner do evento"
        hint="Aparece no topo da página pública e no card do evento para o participante. Recomendado: 1200×630px."
        value={bannerUrl}
        onChange={setBannerUrl}
        folder="event-banners"
        aspectRatio="1200 / 630"
      />

      <div className="presets">
        {PRESETS.map((p) => (
          <button
            key={p.name}
            type="button"
            className={`preset ${colors.name === p.name ? "selected" : ""}`}
            onClick={() => setColors(p)}
            style={{ background: p.background, color: p.text }}
          >
            <span className="dot" style={{ background: p.primary }} />
            {p.name}
          </button>
        ))}
      </div>

      <div className="grid">
        <Field label="Cor principal">
          <Input
            type="color"
            value={colors.primary}
            onChange={(e) => setColors({ ...colors, primary: e.target.value })}
          />
        </Field>
        <Field label="Fundo">
          <Input
            type="color"
            value={colors.background}
            onChange={(e) => setColors({ ...colors, background: e.target.value })}
          />
        </Field>
        <Field label="Superfície (cards)">
          <Input
            type="color"
            value={colors.surface}
            onChange={(e) => setColors({ ...colors, surface: e.target.value })}
          />
        </Field>
        <Field label="Texto">
          <Input
            type="color"
            value={colors.text}
            onChange={(e) => setColors({ ...colors, text: e.target.value })}
          />
        </Field>
      </div>

      <Field label="CSS personalizado" hint="Opcional, para ajustes finos além da interface visual.">
        <textarea
          className="css-box"
          rows={4}
          placeholder=".hero h1 { letter-spacing: 0.02em; }"
          value={customCss}
          onChange={(e) => setCustomCss(e.target.value)}
        />
      </Field>

      <div className="actions">
        <Button onClick={save} disabled={saving}>
          {saving ? "Salvando…" : "Continuar →"}
        </Button>
      </div>

      <style jsx>{`
        h2 {
          margin: 0 0 0.35rem;
        }
        .subtitle {
          color: var(--text-muted);
          font-size: 0.9rem;
          margin-bottom: 1.5rem;
        }
        .presets {
          display: flex;
          gap: 0.6rem;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
        }
        .preset {
          border: 2px solid transparent;
          border-radius: 0.6rem;
          padding: 0.5rem 0.9rem;
          font-size: 0.8rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 0.4rem;
        }
        .preset.selected {
          border-color: var(--indigo-600);
        }
        .dot {
          width: 0.6rem;
          height: 0.6rem;
          border-radius: 50%;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.75rem;
        }
        .css-box {
          font-family: var(--font-mono, monospace);
          font-size: 0.8rem;
          padding: 0.7rem;
          border-radius: 0.6rem;
          border: 1px solid var(--border);
        }
        .actions {
          margin-top: 1.5rem;
        }
      `}</style>
    </Card>
  );
}
