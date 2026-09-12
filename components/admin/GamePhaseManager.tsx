"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input } from "@/components/ui/primitives";

type Visibility = "DRAFT" | "TESTING" | "LIVE";
type GameType = "QUIZ" | "MEMORY" | "RHYTHM" | "HUNT" | "CARDS" | "REACTION" | "RUN";

interface QuizContent {
  question: string;
  options: string[];
  correctIndex: number;
}

interface ReactionContent {
  rounds?: number;
  decoyChance?: number;
}

interface MemoryContent {
  pairs?: number;
  timeLimitSeconds?: number;
}

interface RunContent {
  durationSeconds?: number;
  targetScore?: number;
}

interface Phase {
  id: string;
  order: number;
  title: string;
  content: QuizContent & ReactionContent & MemoryContent & RunContent;
  points: number;
  rewardCardId: string | null;
  grantsExtraTicket: boolean;
}

interface CardOption {
  id: string;
  name: string;
  rarity: string;
}

const VISIBILITY_STEPS: { value: Visibility; label: string; hint: string }[] = [
  { value: "DRAFT", label: "Rascunho", hint: "Só o admin vê e joga." },
  { value: "TESTING", label: "Teste", hint: "Aparece só pra quem está na lista de testadores." },
  { value: "LIVE", label: "Ao vivo", hint: "Aparece pra qualquer participante do Universo AS." },
];

const EMPTY_DRAFT = {
  title: "",
  question: "",
  optionsText: "",
  correctIndex: 0,
  points: 10,
  rewardCardId: "",
  grantsExtraTicket: false,
  // Purple Reaction (11/09) - decoyChancePercent fica em 0-100 na UI só pra
  // ser mais natural de digitar, convertido pra 0-1 na hora de salvar.
  rounds: 5,
  decoyChancePercent: 25,
  // AS Memory (11/09) - timeLimitSeconds 0 = sem limite.
  pairs: 8,
  timeLimitSeconds: 0,
  // AS Run (12/09).
  durationSeconds: 30,
  targetScore: 150,
};

export function GamePhaseManager({
  gameId,
  gameType,
  visibility: initialVisibility,
  phases: initialPhases,
  cards,
}: {
  gameId: string;
  gameType: GameType;
  visibility: Visibility;
  phases: Phase[];
  cards: CardOption[];
}) {
  const isReaction = gameType === "REACTION";
  const isMemory = gameType === "MEMORY";
  const isRun = gameType === "RUN";
  // Tipos cuja pontuação depende de um cronômetro/contagem no navegador da
  // pessoa, sem verificação de servidor - nunca concedem número extra de
  // sorteio (ver canGrantTicket em complete/route.ts), só pontos/ranking.
  const noTicket = isReaction || isMemory || isRun;
  const router = useRouter();
  const [visibility, setVisibility] = useState<Visibility>(initialVisibility);
  const [phases, setPhases] = useState(initialPhases);
  const [changingVisibility, setChangingVisibility] = useState(false);
  const [creating, setCreating] = useState(phases.length === 0);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function refreshPhases() {
    router.refresh();
  }

  async function changeVisibility(next: Visibility) {
    setChangingVisibility(true);
    await fetch(`/api/admin/games/${gameId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visibility: next }),
    });
    setVisibility(next);
    setChangingVisibility(false);
    router.refresh();
  }

  function draftFromPhase(p: Phase) {
    return {
      title: p.title,
      question: p.content?.question ?? "",
      optionsText: (p.content?.options ?? []).join("\n"),
      correctIndex: p.content?.correctIndex ?? 0,
      points: p.points,
      rewardCardId: p.rewardCardId ?? "",
      grantsExtraTicket: p.grantsExtraTicket,
      rounds: p.content?.rounds ?? 5,
      decoyChancePercent: Math.round((p.content?.decoyChance ?? 0.25) * 100),
      pairs: p.content?.pairs ?? 8,
      timeLimitSeconds: p.content?.timeLimitSeconds ?? 0,
      durationSeconds: p.content?.durationSeconds ?? 30,
      targetScore: p.content?.targetScore ?? 150,
    };
  }

  function validate(): string | null {
    if (!draft.title.trim()) return "Escreva um título pra fase.";
    if (isReaction || isMemory || isRun) {
      // Rounds/decoy/pares/duração sempre têm um valor seguro
      // (normalizeReactionConfig/normalizeMemoryConfig/normalizeRunConfig
      // clampam tudo no servidor), então não tem muito o que validar aqui.
      return null;
    }
    if (!draft.question.trim()) return "Escreva a pergunta do quiz.";
    const options = draft.optionsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    if (options.length < 2) return "Escreva pelo menos 2 opções de resposta, uma por linha.";
    if (draft.correctIndex < 0 || draft.correctIndex >= options.length) {
      return "Escolha qual opção é a correta.";
    }
    return null;
  }

  async function savePhase(phaseId?: string) {
    const err = validate();
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setSaving(true);

    const content = isReaction
      ? {
          rounds: Number(draft.rounds) || 5,
          decoyChance: (Number(draft.decoyChancePercent) || 0) / 100,
        }
      : isMemory
      ? {
          pairs: Number(draft.pairs) || 8,
          timeLimitSeconds: Number(draft.timeLimitSeconds) || 0,
        }
      : isRun
      ? {
          durationSeconds: Number(draft.durationSeconds) || 30,
          targetScore: Number(draft.targetScore) || 150,
        }
      : (() => {
          const options = draft.optionsText
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean);
          return { question: draft.question.trim(), options, correctIndex: draft.correctIndex };
        })();

    const body = {
      title: draft.title.trim(),
      content,
      points: Number(draft.points) || 0,
      rewardCardId: draft.rewardCardId || null,
      // Reaction/Memory nunca concedem número extra de sorteio (pontuação
      // depende de cronômetro/contagem no navegador da pessoa) - ver
      // canGrantTicket na rota complete/route.ts. Forçado aqui pra UI nem
      // oferecer a opção.
      grantsExtraTicket: noTicket ? false : draft.grantsExtraTicket,
    };

    const url = phaseId
      ? `/api/admin/games/${gameId}/phases/${phaseId}`
      : `/api/admin/games/${gameId}/phases`;
    const res = await fetch(url, {
      method: phaseId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setError(b.error || "Não deu pra salvar a fase.");
      return;
    }
    setCreating(false);
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
    refreshPhases();
  }

  async function deletePhase(phaseId: string) {
    if (!confirm("Excluir essa fase? O progresso já registrado dos jogadores é perdido.")) return;
    setDeletingId(phaseId);
    await fetch(`/api/admin/games/${gameId}/phases/${phaseId}`, { method: "DELETE" });
    setDeletingId(null);
    refreshPhases();
  }

  return (
    <div className="wrap">
      <div className="card visibility-card">
        <p className="section-title">Estágio de liberação</p>
        <div className="steps">
          {VISIBILITY_STEPS.map((step) => (
            <button
              key={step.value}
              type="button"
              className={`step ${visibility === step.value ? "active" : ""}`}
              disabled={changingVisibility}
              onClick={() => changeVisibility(step.value)}
            >
              <strong>{step.label}</strong>
              <span>{step.hint}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="section-header">
        <p className="section-title">
          Fases ({isReaction ? "reação" : isMemory ? "memória" : isRun ? "corrida" : "quiz"})
        </p>
        {!creating && !editingId && (
          <Button
            onClick={() => {
              setDraft(EMPTY_DRAFT);
              setCreating(true);
            }}
          >
            + Nova fase
          </Button>
        )}
      </div>

      {creating && (
        <PhaseForm
          draft={draft}
          setDraft={setDraft}
          cards={cards}
          isReaction={isReaction}
          isMemory={isMemory}
          isRun={isRun}
          error={error}
          saving={saving}
          onCancel={() => {
            setCreating(false);
            setError(null);
          }}
          onSave={() => savePhase()}
          saveLabel="Criar fase"
        />
      )}

      <div className="list">
        {phases.map((phase) =>
          editingId === phase.id ? (
            <PhaseForm
              key={phase.id}
              draft={draft}
              setDraft={setDraft}
              cards={cards}
              isReaction={isReaction}
              isMemory={isMemory}
              isRun={isRun}
              error={error}
              saving={saving}
              onCancel={() => {
                setEditingId(null);
                setError(null);
              }}
              onSave={() => savePhase(phase.id)}
              saveLabel="Salvar alterações"
            />
          ) : (
            <div key={phase.id} className="card phase-row">
              <div className="info">
                <p className="title">
                  {phase.order + 1}. {phase.title}
                </p>
                <p className="meta">
                  {phase.points} pts
                  {phase.rewardCardId && ` · 🎴 concede card`}
                  {phase.grantsExtraTicket && ` · 🎟️ número extra pra quem está no evento`}
                </p>
              </div>
              <div className="actions">
                <button
                  type="button"
                  className="edit-btn"
                  onClick={() => {
                    setDraft(draftFromPhase(phase));
                    setEditingId(phase.id);
                    setCreating(false);
                    setError(null);
                  }}
                >
                  ✏️ Editar
                </button>
                <button
                  type="button"
                  className="delete-btn"
                  disabled={deletingId === phase.id}
                  onClick={() => deletePhase(phase.id)}
                >
                  Excluir
                </button>
              </div>
            </div>
          )
        )}
        {phases.length === 0 && !creating && <p className="empty">Nenhuma fase criada ainda.</p>}
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
        .visibility-card {
          margin-bottom: 1.75rem;
        }
        .section-title {
          font-size: 0.85rem;
          font-weight: 700;
          margin: 0 0 0.75rem;
        }
        .steps {
          display: flex;
          gap: 0.6rem;
          flex-wrap: wrap;
        }
        .step {
          flex: 1;
          min-width: 9rem;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          text-align: left;
          padding: 0.7rem 0.9rem;
          border-radius: 0.6rem;
          border: 1px solid var(--border);
          background: var(--bg);
          cursor: pointer;
          color: var(--text-muted);
        }
        .step strong {
          color: var(--text);
          font-size: 0.85rem;
        }
        .step span {
          font-size: 0.75rem;
        }
        .step.active {
          border-color: var(--indigo-600);
          background: rgba(79, 70, 229, 0.08);
        }
        .step.active strong {
          color: var(--indigo-600);
        }
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }
        .list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        .phase-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 1rem;
          flex-wrap: wrap;
        }
        .info {
          min-width: 0;
          flex: 1;
        }
        .title {
          margin: 0 0 0.3rem;
          font-weight: 600;
          font-size: 0.92rem;
        }
        .meta {
          margin: 0;
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        .actions {
          display: flex;
          gap: 0.5rem;
          flex-shrink: 0;
        }
        .edit-btn,
        .delete-btn {
          font-size: 0.78rem;
          font-weight: 600;
          padding: 0.4rem 0.8rem;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: none;
          color: var(--text-muted);
          cursor: pointer;
        }
        .edit-btn:hover {
          border-color: var(--indigo-600);
          color: var(--text);
        }
        .delete-btn {
          color: #c0392b;
        }
        .delete-btn:hover {
          border-color: #c0392b;
        }
        .empty {
          color: var(--text-muted);
          font-size: 0.9rem;
        }
      `}</style>
    </div>
  );
}

function PhaseForm({
  draft,
  setDraft,
  cards,
  isReaction,
  isMemory,
  isRun,
  error,
  saving,
  onCancel,
  onSave,
  saveLabel,
}: {
  draft: typeof EMPTY_DRAFT;
  setDraft: (d: typeof EMPTY_DRAFT) => void;
  cards: CardOption[];
  isReaction: boolean;
  isMemory: boolean;
  isRun: boolean;
  error: string | null;
  saving: boolean;
  onCancel: () => void;
  onSave: () => void;
  saveLabel: string;
}) {
  const options = draft.optionsText
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  return (
    <div className="form-card">
      <Field label="Título da fase" required>
        <Input
          value={draft.title}
          onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          placeholder={
            isReaction
              ? "Ex: Reflexo Roxo"
              : isMemory
              ? "Ex: Memória AS"
              : isRun
              ? "Ex: Corrida pro Show"
              : "Ex: Fase 1 - Curiosidades AS Brasil"
          }
        />
      </Field>

      {isReaction ? (
        <>
          <Field label="Quantidade de rodadas" hint="Entre 3 e 15 - cada rodada é um alvo (ou chamariz) na tela.">
            <Input
              type="number"
              value={draft.rounds}
              onChange={(e) => setDraft({ ...draft, rounds: Number(e.target.value) })}
            />
          </Field>
          <Field
            label="Chance de chamariz (%)"
            hint="Rodada que NÃO deve ser tocada - testa o impulso da pessoa. 0 a 60%."
          >
            <Input
              type="number"
              value={draft.decoyChancePercent}
              onChange={(e) => setDraft({ ...draft, decoyChancePercent: Number(e.target.value) })}
            />
          </Field>
        </>
      ) : isMemory ? (
        <>
          <Field label="Quantidade de pares" hint="Entre 4 e 18 pares de cartas (8 a 36 cartas na mesa).">
            <Input
              type="number"
              value={draft.pairs}
              onChange={(e) => setDraft({ ...draft, pairs: Number(e.target.value) })}
            />
          </Field>
          <Field label="Limite de tempo (segundos)" hint="0 = sem limite de tempo, só conta jogadas e velocidade.">
            <Input
              type="number"
              value={draft.timeLimitSeconds}
              onChange={(e) => setDraft({ ...draft, timeLimitSeconds: Number(e.target.value) })}
            />
          </Field>
        </>
      ) : isRun ? (
        <>
          <Field label="Duração da corrida (segundos)" hint="Entre 15 e 90 segundos.">
            <Input
              type="number"
              value={draft.durationSeconds}
              onChange={(e) => setDraft({ ...draft, durationSeconds: Number(e.target.value) })}
            />
          </Field>
          <Field
            label="Pontuação pra 100%"
            hint="Referência de 'desempenho cheio' pra essa corrida - ajuste conforme a dificuldade que quiser pro evento."
          >
            <Input
              type="number"
              value={draft.targetScore}
              onChange={(e) => setDraft({ ...draft, targetScore: Number(e.target.value) })}
            />
          </Field>
        </>
      ) : (
        <>
          <Field label="Pergunta" required>
            <textarea
              className="textarea"
              rows={2}
              value={draft.question}
              onChange={(e) => setDraft({ ...draft, question: e.target.value })}
              placeholder="Ex: Em que ano a AS Brasil foi fundada?"
            />
          </Field>
          <Field label="Opções de resposta" required hint="Uma por linha, pelo menos 2.">
            <textarea
              className="textarea"
              rows={4}
              value={draft.optionsText}
              onChange={(e) => setDraft({ ...draft, optionsText: e.target.value })}
              placeholder={"2010\n2015\n2018"}
            />
          </Field>
          {options.length > 0 && (
            <Field label="Qual é a correta?" required>
              <select
                value={draft.correctIndex}
                onChange={(e) => setDraft({ ...draft, correctIndex: Number(e.target.value) })}
              >
                {options.map((opt, i) => (
                  <option key={i} value={i}>
                    {opt}
                  </option>
                ))}
              </select>
            </Field>
          )}
        </>
      )}

      <Field label="Pontos">
        <Input
          type="number"
          value={draft.points}
          onChange={(e) => setDraft({ ...draft, points: Number(e.target.value) })}
        />
      </Field>
      <Field
        label="Card de recompensa"
        hint="Opcional - o jogador ganha esse card do álbum ao completar a fase."
      >
        <select
          value={draft.rewardCardId}
          onChange={(e) => setDraft({ ...draft, rewardCardId: e.target.value })}
        >
          <option value="">Nenhum</option>
          {cards.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.rarity})
            </option>
          ))}
        </select>
      </Field>
      {isReaction || isMemory || isRun ? (
        <p className="reaction-note">
          Fases desse tipo nunca concedem número extra de sorteio (a pontuação depende de um
          cronômetro/contagem no navegador da pessoa) - só pontos, ranking e card de recompensa.
        </p>
      ) : (
        <label className="checkbox">
          <input
            type="checkbox"
            checked={draft.grantsExtraTicket}
            onChange={(e) => setDraft({ ...draft, grantsExtraTicket: e.target.checked })}
          />
          <span>
            Concede número extra no sorteio do evento (só pra quem já está inscrito no evento)
          </span>
        </label>
      )}
      {error && <p className="error">{error}</p>}
      <div className="form-actions">
        <Button variant="ghost" onClick={onCancel} disabled={saving}>
          Cancelar
        </Button>
        <Button onClick={onSave} disabled={saving}>
          {saving ? "Salvando…" : saveLabel}
        </Button>
      </div>

      <style jsx>{`
        .form-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 0.75rem;
          padding: 1.1rem 1.25rem;
          margin-bottom: 0.75rem;
        }
        select {
          width: 100%;
          padding: 0.6rem 0.7rem;
          border-radius: 0.5rem;
          border: 1px solid var(--border);
          background: var(--surface);
          color: var(--text);
        }
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
        .checkbox {
          display: flex;
          align-items: flex-start;
          gap: 0.5rem;
          font-size: 0.85rem;
          color: var(--text-muted);
          margin-bottom: 1rem;
          cursor: pointer;
        }
        .checkbox input {
          margin-top: 0.2rem;
        }
        .reaction-note {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin: 0 0 1rem;
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
      `}</style>
    </div>
  );
}
