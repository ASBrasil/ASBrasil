"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field } from "@/components/ui/primitives";
import { ImageUpload } from "@/components/admin/ImageUpload";

interface GameTheme {
  primaryColor?: string;
  secondaryColor?: string;
  backgroundImageUrl?: string | null;
  // Modo Rush (11/09) - cronometra cada fase e dá bônus de pontuação por
  // velocidade quando a pessoa acerta tudo. Guardado aqui (dentro do theme,
  // que já é JSON livre) de propósito, pra não precisar de migration nova -
  // ver lib/games.ts::getRushConfig.
  rushMode?: boolean;
  rushTimeLimitSeconds?: number;
}

const DEFAULT_THEME: Required<GameTheme> = {
  primaryColor: "#3B55E6",
  secondaryColor: "#0c2a5b",
  backgroundImageUrl: null,
  rushMode: false,
  rushTimeLimitSeconds: 8,
};

export function GameThemeEditor({
  gameId,
  theme: initialTheme,
}: {
  gameId: string;
  theme: GameTheme | null;
}) {
  const router = useRouter();
  const [theme, setTheme] = useState<Required<GameTheme>>({
    ...DEFAULT_THEME,
    ...(initialTheme ?? {}),
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setSaved(false);
    await fetch(`/api/admin/games/${gameId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme }),
    });
    setSaving(false);
    setSaved(true);
    router.refresh();
    setTimeout(() => setSaved(false), 2500);
  }

  return (
    <div className="card">
      <p className="section-title">🎨 Visual do jogo</p>
      <p className="hint-text">
        Cada jogo pode ter sua própria cara - essas cores e a imagem de fundo aparecem na tela do
        jogo quando o participante for jogar.
      </p>

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
        label="Imagem de fundo"
        hint="Opcional - aparece atrás do conteúdo do jogo, com um leve escurecido por cima pra manter o texto legível."
        value={theme.backgroundImageUrl}
        onChange={(url) => setTheme({ ...theme, backgroundImageUrl: url })}
        folder="game-themes"
        aspectRatio="16 / 9"
      />

      <div className="rush-card">
        <label className="checkbox">
          <input
            type="checkbox"
            checked={theme.rushMode}
            onChange={(e) => setTheme({ ...theme, rushMode: e.target.checked })}
          />
          <span>
            <strong>⚡ Modo Rush</strong> — cronometra cada fase e dá bônus de pontuação por
            velocidade (até +50%) pra quem acerta tudo rápido. Sem cronômetro, o jogo funciona
            exatamente como hoje.
          </span>
        </label>
        {theme.rushMode && (
          <Field label="Segundos por fase" hint="Tempo que a pessoa tem pra responder antes de passar direto pra próxima.">
            <input
              type="number"
              min={3}
              max={60}
              className="seconds-input"
              value={theme.rushTimeLimitSeconds}
              onChange={(e) =>
                setTheme({ ...theme, rushTimeLimitSeconds: Number(e.target.value) || 8 })
              }
            />
          </Field>
        )}
      </div>

      <div
        className="preview"
        style={{
          background: theme.backgroundImageUrl
            ? `linear-gradient(180deg, ${theme.primaryColor}cc, ${theme.secondaryColor}cc), url(${theme.backgroundImageUrl}) center/cover`
            : `linear-gradient(160deg, ${theme.primaryColor}, ${theme.secondaryColor})`,
        }}
      >
        <span>Prévia do visual</span>
      </div>

      <div className="form-actions">
        <Button onClick={save} disabled={saving}>
          {saving ? "Salvando…" : "Salvar visual"}
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
        .rush-card {
          border-top: 1px dashed var(--border);
          margin-top: 1rem;
          padding-top: 1rem;
        }
        .checkbox {
          display: flex;
          align-items: flex-start;
          gap: 0.6rem;
          cursor: pointer;
        }
        .checkbox input {
          margin-top: 0.2rem;
        }
        .checkbox span {
          font-size: 0.82rem;
          color: var(--text-muted);
          line-height: 1.5;
        }
        .checkbox strong {
          color: var(--text);
        }
        .seconds-input {
          width: 6rem;
          padding: 0.5rem 0.7rem;
          border-radius: 0.5rem;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--text);
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
          font-size: 0.8rem;
          font-weight: 600;
          text-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
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
