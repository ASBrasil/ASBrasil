"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input } from "@/components/ui/primitives";
import { ImageUpload } from "@/components/admin/ImageUpload";

interface Character {
  id: string;
  name: string;
  rarity: string;
  imageUrl: string | null;
  description: string | null;
  spriteId: string | null;
  pointsCost: number;
  isStarter: boolean;
}

// Esqueletos de animação prontos (mesma lista de SPRITE_IDS em
// lib/characters.ts) - vários personagens/peles podem apontar pro mesmo,
// só a imagem/nome mostrados fora do jogo mudam.
const SPRITE_OPTIONS = ["jhope", "jimin", "jin", "jungkook", "rm", "suga", "v"];

const EMPTY_FORM = {
  name: "",
  rarity: "comum",
  imageUrl: null as string | null,
  description: "",
  spriteId: "" as string,
  pointsCost: 0,
  isStarter: false,
};

function formFromCharacter(character: Character) {
  return {
    name: character.name,
    rarity: character.rarity,
    imageUrl: character.imageUrl,
    description: character.description ?? "",
    spriteId: character.spriteId ?? "",
    pointsCost: character.pointsCost,
    isStarter: character.isStarter,
  };
}

/**
 * Elenco de personagens de uma Experience - molde direto de
 * GameCardManager.tsx (mesma UX de criar/editar/dar manualmente), mas sem
 * seletor de "gatilho automático" aqui: quem concede automaticamente é o
 * seletor de "Personagem de recompensa" no editor de fases
 * (GamePhaseManager.tsx), porque o gatilho é por fase, não por
 * evento/jogo inteiro como nas figurinhas.
 */
export function ExperienceCharactersManager({
  experienceId,
  characters: initialCharacters,
}: {
  experienceId: string;
  characters: Character[];
}) {
  const router = useRouter();
  const [characters, setCharacters] = useState(initialCharacters);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [grantingId, setGrantingId] = useState<string | null>(null);

  function refresh() {
    router.refresh();
    fetch(`/api/admin/experiences/${experienceId}/characters`)
      .then((r) => r.json())
      .then((d) => setCharacters(d.characters ?? []));
  }

  return (
    <div className="wrap">
      <div className="section-header">
        <p className="section-title">Personagens</p>
        {!creating && <Button onClick={() => setCreating(true)}>+ Novo personagem</Button>}
      </div>
      <p className="hint">
        Cada personagem pertence só a essa Experiência - é o elenco jogável do arcade (Universo AS),
        não só um avatar de perfil. Dá pra liberar um personagem de 3 jeitos: marcando como{" "}
        <strong>inicial</strong> (todo mundo já ganha de graça), configurando um{" "}
        <strong>preço em moedas</strong> (aparece na Loja do arcade, a pessoa junta jogando e
        desbloqueia), ou como "Personagem de recompensa" numa fase de algum jogo (aba Jogos → editar
        fase). O "esqueleto de animação" decide os movimentos dele quando a pessoa joga - vários
        personagens podem usar o mesmo esqueleto, só a imagem muda.
      </p>

      {creating && (
        <div className="card">
          <CharacterFormFields
            initial={EMPTY_FORM}
            onCancel={() => setCreating(false)}
            onSave={async (form) => {
              await fetch(`/api/admin/experiences/${experienceId}/characters`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(form),
              });
              setCreating(false);
              refresh();
            }}
            saveLabel="Criar personagem"
          />
        </div>
      )}

      <div className="grid">
        {characters.map((character) => (
          <div key={character.id} className="card">
            {editingId === character.id ? (
              <CharacterFormFields
                initial={formFromCharacter(character)}
                onCancel={() => setEditingId(null)}
                onSave={async (form) => {
                  await fetch(`/api/admin/characters/${character.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(form),
                  });
                  setEditingId(null);
                  refresh();
                }}
                saveLabel="Salvar alterações"
              />
            ) : grantingId === character.id ? (
              <GrantPanel
                character={character}
                onCancel={() => setGrantingId(null)}
                onDone={() => setGrantingId(null)}
              />
            ) : (
              <div className="preview-card">
                {character.imageUrl ? (
                  <img src={character.imageUrl} alt={character.name} className="thumb" />
                ) : (
                  <div className="thumb placeholder">🧸</div>
                )}
                <p className="name">{character.name}</p>
                <span className="rarity">{character.rarity}</span>
                <div className="badges">
                  {character.isStarter && <span className="badge starter">🔓 inicial</span>}
                  {character.pointsCost > 0 && <span className="badge price">🪙 {character.pointsCost}</span>}
                  {!character.spriteId && <span className="badge warn">sem moveset</span>}
                </div>
                <div className="actions">
                  <button type="button" className="edit-btn" onClick={() => setEditingId(character.id)}>
                    ✏️ Editar
                  </button>
                  <button type="button" className="edit-btn" onClick={() => setGrantingId(character.id)}>
                    🎁 Dar personagem
                  </button>
                  <button
                    type="button"
                    className="delete-btn"
                    onClick={async () => {
                      if (!confirm("Excluir esse personagem? Ele some da coleção de quem já tinha.")) return;
                      await fetch(`/api/admin/characters/${character.id}`, { method: "DELETE" });
                      refresh();
                    }}
                  >
                    Excluir
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
        {characters.length === 0 && !creating && (
          <p className="empty">Nenhum personagem criado ainda pra essa Experiência.</p>
        )}
      </div>

      <style jsx>{`
        .wrap {
          max-width: 52rem;
          margin-top: 2rem;
        }
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.4rem;
          gap: 1rem;
        }
        .section-title {
          font-size: 1.05rem;
          font-weight: 700;
          margin: 0;
          font-family: var(--font-display, inherit);
        }
        .hint {
          color: var(--text-muted);
          font-size: 0.85rem;
          margin: 0 0 1rem;
          line-height: 1.5;
          max-width: 42rem;
        }
        .card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 0.75rem;
          padding: 1.1rem 1.25rem;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(13rem, 1fr));
          gap: 0.75rem;
          margin-top: 1rem;
        }
        .preview-card {
          display: flex;
          flex-direction: column;
        }
        .thumb {
          width: 100%;
          aspect-ratio: 1 / 1;
          object-fit: cover;
          border-radius: 0.5rem;
          margin-bottom: 0.6rem;
        }
        .thumb.placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg);
          font-size: 2rem;
        }
        .name {
          margin: 0 0 0.2rem;
          font-weight: 600;
          font-size: 0.9rem;
        }
        .rarity {
          font-size: 0.72rem;
          font-weight: 600;
          color: var(--text-muted);
          text-transform: uppercase;
          margin-bottom: 0.3rem;
        }
        .badges {
          display: flex;
          flex-wrap: wrap;
          gap: 0.3rem;
          margin-bottom: 0.6rem;
        }
        .badge {
          font-size: 0.68rem;
          font-weight: 700;
          padding: 0.15rem 0.5rem;
          border-radius: 999px;
          background: var(--bg);
          color: var(--text-muted);
          border: 1px solid var(--border);
        }
        .badge.starter {
          color: #1a8a4a;
          border-color: #1a8a4a55;
        }
        .badge.price {
          color: #a9790a;
          border-color: #a9790a55;
        }
        .badge.warn {
          color: #c0392b;
          border-color: #c0392b55;
        }
        .actions {
          display: flex;
          flex-wrap: wrap;
          gap: 0.4rem;
        }
        .edit-btn,
        .delete-btn {
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.35rem 0.65rem;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: none;
          color: var(--text-muted);
          cursor: pointer;
        }
        .delete-btn {
          color: #c0392b;
        }
        .empty {
          color: var(--text-muted);
          font-size: 0.9rem;
        }
      `}</style>
    </div>
  );
}

function GrantPanel({
  character,
  onCancel,
  onDone,
}: {
  character: Character;
  onCancel: () => void;
  onDone: () => void;
}) {
  const [emails, setEmails] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function send() {
    setSending(true);
    setResult(null);
    const res = await fetch(`/api/admin/characters/${character.id}/grant`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emails }),
    });
    const data = await res.json().catch(() => ({}));
    setSending(false);
    if (!res.ok) {
      setResult(data.error ?? "Não foi possível conceder o personagem.");
      return;
    }
    setResult(`✓ Concedido a ${data.granted} de ${data.total} e-mail(s).`);
  }

  return (
    <div className="grant">
      <p className="grant-title">🎁 Dar "{character.name}" manualmente</p>
      <p className="grant-hint">Um e-mail por linha (ou separados por vírgula).</p>
      <textarea
        className="textarea"
        rows={4}
        value={emails}
        onChange={(e) => setEmails(e.target.value)}
        placeholder={"maria@exemplo.com\njoao@exemplo.com"}
      />
      <div className="grant-actions">
        <Button variant="ghost" onClick={onCancel} disabled={sending}>
          Fechar
        </Button>
        <Button onClick={send} disabled={sending || !emails.trim()}>
          {sending ? "Enviando…" : "Conceder"}
        </Button>
      </div>
      {result && <p className="grant-result">{result}</p>}

      <style jsx>{`
        .grant-title {
          margin: 0 0 0.2rem;
          font-weight: 700;
          font-size: 0.9rem;
        }
        .grant-hint {
          margin: 0 0 0.6rem;
          font-size: 0.78rem;
          color: var(--text-muted);
        }
        .textarea {
          width: 100%;
          box-sizing: border-box;
          padding: 0.7rem 0.9rem;
          border-radius: 0.6rem;
          border: 1px solid var(--border);
          font-size: 0.85rem;
          font-family: inherit;
          resize: vertical;
          background: var(--surface);
          color: var(--text);
        }
        .grant-actions {
          display: flex;
          gap: 0.6rem;
          margin-top: 0.6rem;
        }
        .grant-result {
          margin: 0.6rem 0 0;
          font-size: 0.8rem;
        }
      `}</style>
    </div>
  );
}

function CharacterFormFields({
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

  const canSave = form.name.trim().length > 0;

  return (
    <div>
      <Field label="Nome do personagem" required>
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </Field>
      <Field label="Raridade" hint="Texto livre, ex: comum, raro, épico, lendário.">
        <Input value={form.rarity} onChange={(e) => setForm({ ...form, rarity: e.target.value })} />
      </Field>
      <ImageUpload
        label="Imagem do personagem"
        value={form.imageUrl}
        onChange={(url) => setForm({ ...form, imageUrl: url })}
        folder="characters"
        aspectRatio="1 / 1"
      />
      <Field label="Descrição" hint="Opcional.">
        <textarea
          className="textarea"
          rows={3}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
      </Field>
      <Field
        label="Esqueleto de animação (moveset)"
        hint="Decide os movimentos quando a pessoa joga com ele. Vários personagens podem usar o mesmo - só a imagem acima muda. Sem escolher, cai num padrão em vez de travar o jogo."
      >
        <select
          className="as-select"
          value={form.spriteId}
          onChange={(e) => setForm({ ...form, spriteId: e.target.value })}
        >
          <option value="">— padrão —</option>
          {SPRITE_OPTIONS.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Preço na Loja (moedas)" hint="0 = não aparece na Loja (só por recompensa ou concessão manual).">
        <Input
          type="number"
          min={0}
          value={String(form.pointsCost)}
          onChange={(e) => setForm({ ...form, pointsCost: Math.max(0, Number(e.target.value) || 0) })}
        />
      </Field>
      <label className="starter-check">
        <input
          type="checkbox"
          checked={form.isStarter}
          onChange={(e) => setForm({ ...form, isStarter: e.target.checked })}
        />
        Personagem inicial - todo mundo já ganha de graça ao abrir o arcade dessa Experiência
      </label>

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
      <style jsx>{`
        .starter-check {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.85rem;
          color: var(--text);
          margin: 0.4rem 0 0.9rem;
          cursor: pointer;
        }
        .starter-check input {
          width: 1rem;
          height: 1rem;
          flex-shrink: 0;
        }
      `}</style>
    </div>
  );
}
