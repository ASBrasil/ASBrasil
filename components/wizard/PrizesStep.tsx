"use client";

import { useState } from "react";
import { Button, Field, Input, Card } from "@/components/ui/primitives";
import { ImageUpload } from "@/components/admin/ImageUpload";

interface DraftPrize {
  name: string;
  description: string;
  scheduledAt: string;
  imageUrl: string | null;
  winMessage: string;
  loseMessage: string;
  couponCode: string;
}

const EMPTY_DRAFT: DraftPrize = {
  name: "",
  description: "",
  scheduledAt: "",
  imageUrl: null,
  winMessage: "",
  loseMessage: "",
  couponCode: "",
};

export function PrizesStep({
  eventId,
  onDone,
  onBack,
  existingPrizes = [],
}: {
  eventId: string;
  onDone: () => void;
  onBack?: () => void;
  existingPrizes?: { id: string; name: string; imageUrl?: string | null }[];
}) {
  const [saved, setSaved] = useState<{ name: string; imageUrl: string | null }[]>([]);
  const allPrizes = [...existingPrizes, ...saved];
  const [draft, setDraft] = useState<DraftPrize>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);

  async function addPrize() {
    if (!draft.name) return;
    setSaving(true);
    const res = await fetch("/api/admin/prizes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId,
        name: draft.name,
        description: draft.description || undefined,
        order: allPrizes.length,
        scheduledAt: draft.scheduledAt || undefined,
        imageUrl: draft.imageUrl || undefined,
        winMessage: draft.winMessage || undefined,
        loseMessage: draft.loseMessage || undefined,
        couponCode: draft.couponCode || undefined,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setSaved((s) => [...s, { name: draft.name, imageUrl: draft.imageUrl }]);
      setDraft(EMPTY_DRAFT);
    }
  }

  return (
    <Card icon="🎁">
      <h2>Cadastre os prêmios</h2>
      <p className="subtitle">Cada prêmio terá seu próprio sorteio, na ordem em que forem criados.</p>

      {allPrizes.length > 0 && (
        <ul className="saved-list">
          {allPrizes.map((p, i) => (
            <li key={i}>
              {p.imageUrl ? (
                <img src={p.imageUrl} alt="" className="thumb" />
              ) : (
                <span className="thumb placeholder">🎁</span>
              )}
              {p.name}
            </li>
          ))}
        </ul>
      )}

      <Field label="Nome do prêmio" required>
        <Input
          placeholder="Meet & Greet"
          value={draft.name}
          onChange={(e) => setDraft({ ...draft, name: e.target.value })}
        />
      </Field>

      <ImageUpload
        label="Imagem do prêmio"
        hint="Aparece no card do prêmio e na tela de resultado do participante."
        value={draft.imageUrl}
        onChange={(url) => setDraft({ ...draft, imageUrl: url })}
        folder="prize-images"
        aspectRatio="4 / 3"
      />

      <Field label="Descrição">
        <Input
          placeholder="Encontro com a banda antes do show"
          value={draft.description}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
        />
      </Field>
      <Field label="Data e hora do sorteio" hint="Opcional, pode definir depois">
        <Input
          type="datetime-local"
          value={draft.scheduledAt}
          onChange={(e) => setDraft({ ...draft, scheduledAt: e.target.value })}
        />
      </Field>

      <div className="divider">
        <span>Mensagens de resultado</span>
      </div>

      <Field
        label="Mensagem para quem ganhar"
        hint="Aparece na tela de resultado só para o vencedor. Em branco, usa a mensagem padrão."
      >
        <textarea
          className="textarea"
          rows={2}
          placeholder="Parabéns! Você ganhou o Meet & Greet 🎉 Fique de olho no seu e-mail com os detalhes."
          value={draft.winMessage}
          onChange={(e) => setDraft({ ...draft, winMessage: e.target.value })}
        />
      </Field>
      <Field
        label="Cupom para o vencedor"
        hint="Opcional. Mostrado junto com a mensagem de vitória, só para quem ganhar."
      >
        <Input
          placeholder="MEETBTS10"
          value={draft.couponCode}
          onChange={(e) => setDraft({ ...draft, couponCode: e.target.value })}
        />
      </Field>
      <Field
        label="Mensagem para quem não ganhar"
        hint="Aparece para todo mundo que concorreu a esse prêmio e não ganhou."
      >
        <textarea
          className="textarea"
          rows={2}
          placeholder="Essa foi por pouco! Ainda tem mais sorteios rolando, continue de olho."
          value={draft.loseMessage}
          onChange={(e) => setDraft({ ...draft, loseMessage: e.target.value })}
        />
      </Field>

      <div className="actions">
        {onBack && (
          <Button variant="ghost" onClick={onBack}>
            ← Voltar
          </Button>
        )}
        <Button variant="ghost" onClick={addPrize} disabled={!draft.name || saving}>
          {saving ? "Adicionando…" : "+ Adicionar outro prêmio"}
        </Button>
        <Button onClick={onDone}>{allPrizes.length === 0 ? "Pular por agora →" : "Continuar →"}</Button>
      </div>

      <style jsx>{`
        h2 { margin: 0 0 0.35rem; }
        .subtitle { color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1.5rem; }
        .saved-list {
          list-style: none;
          padding: 0;
          margin: 0 0 1.25rem;
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        .saved-list li {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          font-size: 0.9rem;
          background: var(--bg);
          border-radius: 0.5rem;
          padding: 0.4rem 0.75rem;
        }
        .thumb {
          width: 1.75rem;
          height: 1.75rem;
          border-radius: 0.4rem;
          object-fit: cover;
          flex-shrink: 0;
        }
        .thumb.placeholder {
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--surface);
          font-size: 0.9rem;
        }
        .divider {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin: 1.75rem 0 1.25rem;
          font-size: 0.78rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          color: var(--text-muted);
        }
        .divider::before,
        .divider::after {
          content: "";
          flex: 1;
          height: 1px;
          background: var(--border);
        }
        .textarea {
          padding: 0.7rem 0.9rem;
          border-radius: 0.6rem;
          border: 1px solid var(--border);
          font-size: 0.9rem;
          font-family: inherit;
          resize: vertical;
          background: var(--surface);
        }
        .actions { display: flex; gap: 0.75rem; margin-top: 1.25rem; }
      `}</style>
    </Card>
  );
}
