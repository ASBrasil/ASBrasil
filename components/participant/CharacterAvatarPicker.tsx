"use client";

import { useState } from "react";

interface OwnedCharacter {
  id: string;
  name: string;
  rarity: string;
  imageUrl: string | null;
}

/**
 * Escolha de avatar entre os personagens que a pessoa já desbloqueou -
 * quando tem um selecionado, ele tem precedência sobre a foto livre
 * (avatarUrl) na exibição (ver /perfil e RankingList/lib/ranking.ts). Só
 * aparece quando a coleção não está vazia; sem nenhum personagem
 * desbloqueado ainda, a pessoa continua usando só a foto de perfil livre.
 */
export function CharacterAvatarPicker({
  characters,
  initialAvatarCharacterId,
}: {
  characters: OwnedCharacter[];
  initialAvatarCharacterId: string | null;
}) {
  const [selected, setSelected] = useState(initialAvatarCharacterId);
  const [saving, setSaving] = useState(false);

  if (characters.length === 0) return null;

  async function choose(characterId: string | null) {
    setSaving(true);
    const res = await fetch("/api/public/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ avatarCharacterId: characterId }),
    });
    setSaving(false);
    if (res.ok) setSelected(characterId);
  }

  return (
    <div className="picker">
      <p className="picker-label">Avatar do Ranking</p>
      <p className="picker-hint">
        Escolha um personagem desbloqueado pra usar como avatar (aparece no Ranking do Universo AS)
        - ou volte pra sua foto de perfil normal.
      </p>
      <div className="options">
        <button
          type="button"
          className={`option photo-option ${selected === null ? "active" : ""}`}
          disabled={saving}
          onClick={() => choose(null)}
          title="Usar foto de perfil"
        >
          Foto
        </button>
        {characters.map((c) => (
          <button
            key={c.id}
            type="button"
            className={`option ${selected === c.id ? "active" : ""}`}
            disabled={saving}
            onClick={() => choose(c.id)}
            title={c.name}
          >
            {c.imageUrl ? <img src={c.imageUrl} alt={c.name} /> : <span className="placeholder">🧸</span>}
          </button>
        ))}
      </div>

      <style jsx>{`
        .picker {
          margin: 1.25rem 0 1.5rem;
        }
        .picker-label {
          margin: 0 0 0.2rem;
          font-weight: 700;
          font-size: 0.88rem;
        }
        .picker-hint {
          margin: 0 0 0.7rem;
          font-size: 0.78rem;
          color: var(--as-muted, rgba(255, 255, 255, 0.55));
          line-height: 1.5;
        }
        .options {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }
        .option {
          width: 3.4rem;
          height: 3.4rem;
          border-radius: 0.7rem;
          border: 2px solid var(--as-line, rgba(255, 255, 255, 0.15));
          background: rgba(255, 255, 255, 0.05);
          padding: 0;
          overflow: hidden;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .option:disabled {
          opacity: 0.6;
          cursor: default;
        }
        .option.active {
          border-color: var(--as-cyan, #4f5fff);
        }
        .option img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .placeholder {
          font-size: 1.3rem;
          opacity: 0.6;
        }
        .photo-option {
          font-size: 0.7rem;
          font-weight: 700;
          color: var(--as-muted, rgba(255, 255, 255, 0.7));
        }
      `}</style>
    </div>
  );
}
