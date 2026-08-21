"use client";

import { useState } from "react";
import { Button, Field, Input } from "@/components/ui/primitives";

type MissionType = "SELF_CHECK" | "QUIZ" | "PHOTO_UPLOAD" | "LINK_VISIT";

interface Mission {
  id: string;
  type: MissionType;
  order: number;
  required: boolean;
  title: string;
  description: string | null;
  linkUrl: string | null;
  quizOptions: string[] | null;
  quizCorrectIndex: number | null;
}

const TYPE_LABELS: Record<MissionType, { label: string; icon: string; hint: string }> = {
  SELF_CHECK: {
    label: "Autodeclaração",
    icon: "✅",
    hint: 'Ex: "Siga a AS Brasil no Instagram" - mostra um link e um botão "Já fiz!", sem verificação automática.',
  },
  QUIZ: {
    label: "Quiz",
    icon: "❓",
    hint: "Pergunta de múltipla escolha, corrigida na hora.",
  },
  PHOTO_UPLOAD: {
    label: "Upload de foto",
    icon: "📸",
    hint: "A pessoa envia uma imagem pra concluir.",
  },
  LINK_VISIT: {
    label: "Visitar link",
    icon: "🔗",
    hint: "Ex: uma página de FAQ - a pessoa clica, é levada pro link, e confirma que viu.",
  },
};

interface DraftMission {
  type: MissionType;
  title: string;
  description: string;
  required: boolean;
  linkUrl: string;
  quizOptionsText: string; // uma opção por linha
  quizCorrectIndex: number;
}

const EMPTY_DRAFT: DraftMission = {
  type: "SELF_CHECK",
  title: "",
  description: "",
  required: true,
  linkUrl: "",
  quizOptionsText: "",
  quizCorrectIndex: 0,
};

export function MissionManager({
  eventId,
  initialMissions,
}: {
  eventId: string;
  initialMissions: Mission[];
}) {
  const [missions, setMissions] = useState<Mission[]>(initialMissions);
  const [formOpen, setFormOpen] = useState(initialMissions.length === 0);
  const [draft, setDraft] = useState<DraftMission>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function addMission() {
    if (!draft.title) return;
    if (draft.type === "QUIZ") {
      const options = draft.quizOptionsText.split("\n").map((s) => s.trim()).filter(Boolean);
      if (options.length < 2) {
        setError("Escreva pelo menos 2 opções de resposta, uma por linha.");
        return;
      }
    }
    if ((draft.type === "SELF_CHECK" || draft.type === "LINK_VISIT") && !draft.linkUrl) {
      setError("Informe o link.");
      return;
    }

    setSaving(true);
    setError(null);

    const options =
      draft.type === "QUIZ"
        ? draft.quizOptionsText.split("\n").map((s) => s.trim()).filter(Boolean)
        : undefined;

    const res = await fetch("/api/admin/missions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventId,
        type: draft.type,
        title: draft.title,
        description: draft.description || undefined,
        required: draft.required,
        linkUrl: draft.linkUrl || undefined,
        quizOptions: options,
        quizCorrectIndex: draft.type === "QUIZ" ? draft.quizCorrectIndex : undefined,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Não foi possível criar a missão.");
      return;
    }
    setMissions((m) => [...m, data.mission]);
    setDraft(EMPTY_DRAFT);
    setFormOpen(false);
  }

  async function toggleRequired(mission: Mission) {
    const next = !mission.required;
    setMissions((m) => m.map((x) => (x.id === mission.id ? { ...x, required: next } : x)));
    await fetch(`/api/admin/missions/${mission.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ required: next }),
    });
  }

  async function removeMission(id: string) {
    setDeletingId(id);
    const res = await fetch(`/api/admin/missions/${id}`, { method: "DELETE" });
    setDeletingId(null);
    if (res.ok) setMissions((m) => m.filter((x) => x.id !== id));
  }

  return (
    <div>
      {missions.length > 0 && (
        <ul className="mission-list">
          {missions.map((m) => (
            <li key={m.id} className="mission-row">
              <span className="type-icon">{TYPE_LABELS[m.type].icon}</span>
              <div className="mission-info">
                <strong>{m.title}</strong>
                <span className="type-label">{TYPE_LABELS[m.type].label}</span>
              </div>
              <label className="required-toggle">
                <input type="checkbox" checked={m.required} onChange={() => toggleRequired(m)} />
                Obrigatória
              </label>
              <button
                type="button"
                className="delete-btn"
                onClick={() => removeMission(m.id)}
                disabled={deletingId === m.id}
              >
                {deletingId === m.id ? "…" : "Excluir"}
              </button>
            </li>
          ))}
        </ul>
      )}

      {formOpen ? (
        <div className="form-card">
          <Field label="Tipo de missão">
            <div className="type-grid">
              {(Object.keys(TYPE_LABELS) as MissionType[]).map((t) => (
                <button
                  type="button"
                  key={t}
                  className={`type-option ${draft.type === t ? "active" : ""}`}
                  onClick={() => setDraft({ ...draft, type: t })}
                >
                  <span className="type-option-icon">{TYPE_LABELS[t].icon}</span>
                  {TYPE_LABELS[t].label}
                </button>
              ))}
            </div>
            <p className="type-hint">{TYPE_LABELS[draft.type].hint}</p>
          </Field>

          <Field label="Título" required>
            <Input
              placeholder='Ex: "Siga a AS Brasil no Instagram"'
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
          </Field>
          <Field label="Descrição" hint="Opcional">
            <Input
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
          </Field>

          {(draft.type === "SELF_CHECK" || draft.type === "LINK_VISIT") && (
            <Field label="Link" required>
              <Input
                placeholder="https://..."
                value={draft.linkUrl}
                onChange={(e) => setDraft({ ...draft, linkUrl: e.target.value })}
              />
            </Field>
          )}

          {draft.type === "QUIZ" && (
            <>
              <Field label="Opções de resposta" required hint="Uma por linha, pelo menos 2.">
                <textarea
                  className="textarea"
                  rows={4}
                  value={draft.quizOptionsText}
                  onChange={(e) => setDraft({ ...draft, quizOptionsText: e.target.value })}
                  placeholder={"Map of the Soul: 7\nBE\nProof"}
                />
              </Field>
              {draft.quizOptionsText.trim() && (
                <Field label="Qual é a resposta certa?">
                  <select
                    className="select"
                    value={draft.quizCorrectIndex}
                    onChange={(e) => setDraft({ ...draft, quizCorrectIndex: Number(e.target.value) })}
                  >
                    {draft.quizOptionsText
                      .split("\n")
                      .map((s) => s.trim())
                      .filter(Boolean)
                      .map((opt, i) => (
                        <option key={i} value={i}>
                          {opt}
                        </option>
                      ))}
                  </select>
                </Field>
              )}
            </>
          )}

          <label className="required-row">
            <input
              type="checkbox"
              checked={draft.required}
              onChange={(e) => setDraft({ ...draft, required: e.target.checked })}
            />
            <span>
              <strong>Obrigatória</strong>
              <small>Bloqueia o acesso aos números/resultados até ser cumprida. Desmarcada, fica só visível.</small>
            </span>
          </label>

          {error && <p className="error">{error}</p>}

          <div className="actions">
            {missions.length > 0 && (
              <Button variant="ghost" onClick={() => { setFormOpen(false); setError(null); }} disabled={saving}>
                Cancelar
              </Button>
            )}
            <Button onClick={addMission} disabled={!draft.title || saving}>
              {saving ? "Adicionando…" : "Adicionar missão"}
            </Button>
          </div>
        </div>
      ) : (
        <Button variant="ghost" onClick={() => setFormOpen(true)}>
          + Adicionar missão
        </Button>
      )}

      <style jsx>{`
        .mission-list {
          list-style: none;
          padding: 0;
          margin: 0 0 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          max-width: 40rem;
        }
        .mission-row {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 0.6rem;
          padding: 0.7rem 1rem;
        }
        .type-icon {
          font-size: 1.1rem;
          flex-shrink: 0;
        }
        .mission-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 0.1rem;
        }
        .type-label {
          font-size: 0.75rem;
          color: var(--text-muted);
        }
        .required-toggle {
          display: flex;
          align-items: center;
          gap: 0.35rem;
          font-size: 0.78rem;
          color: var(--text-muted);
          cursor: pointer;
          flex-shrink: 0;
          white-space: nowrap;
        }
        .delete-btn {
          font-size: 0.78rem;
          color: #c0392b;
          background: none;
          border: none;
          cursor: pointer;
          flex-shrink: 0;
        }
        .delete-btn:hover {
          text-decoration: underline;
        }
        .form-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 1rem;
          padding: 1.5rem;
          max-width: 32rem;
        }
        .type-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }
        .type-option {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.6rem 0.8rem;
          border: 1px solid var(--border);
          border-radius: 0.5rem;
          background: var(--bg);
          cursor: pointer;
          font-size: 0.85rem;
          color: var(--text);
        }
        .type-option.active {
          border-color: var(--indigo-600);
          background: color-mix(in srgb, var(--indigo-600) 8%, var(--bg));
        }
        .type-option-icon {
          font-size: 1rem;
        }
        .type-hint {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin: 0.4rem 0 1rem;
        }
        .textarea,
        .select {
          width: 100%;
          box-sizing: border-box;
          padding: 0.6rem 0.8rem;
          border-radius: 0.5rem;
          border: 1px solid var(--border);
          background: var(--bg);
          color: var(--text);
          font-family: inherit;
          font-size: 0.88rem;
        }
        .required-row {
          display: flex;
          align-items: flex-start;
          gap: 0.6rem;
          margin: 1rem 0;
          padding: 0.75rem 0.9rem;
          background: var(--bg);
          border-radius: 0.5rem;
          cursor: pointer;
        }
        .required-row input {
          margin-top: 0.2rem;
        }
        .required-row span {
          display: flex;
          flex-direction: column;
          gap: 0.1rem;
        }
        .required-row small {
          color: var(--text-muted);
          font-size: 0.78rem;
        }
        .error {
          color: #c0392b;
          font-size: 0.85rem;
          margin: 0.5rem 0 0;
        }
        .actions {
          display: flex;
          gap: 0.75rem;
          margin-top: 1rem;
        }
      `}</style>
    </div>
  );
}
