"use client";

import { useState } from "react";
import { Stepper } from "@/components/ui/Stepper";
import { Button, Field, Input, Card } from "@/components/ui/primitives";
import { ThemeStep } from "@/components/wizard/ThemeStep";
import { ParticipantsStep } from "@/components/wizard/ParticipantsStep";
import { PrizesStep } from "@/components/wizard/PrizesStep";
import { PublishStep } from "@/components/wizard/PublishStep";

const STEPS = ["Detalhes", "Tema", "Participantes", "Prêmios", "Publicar"];

export default function NewEventWizard() {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    campaign: "",
    slug: "",
    description: "",
    missionMode: "SIMPLE" as "SIMPLE" | "MISSIONS",
  });

  function update(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
    if (key === "name" && !form.slug) {
      setForm((f) => ({
        ...f,
        slug: value
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, ""),
      }));
    }
  }

  async function createEvent() {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/admin/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Não foi possível criar o evento.");
      return;
    }
    const { event } = await res.json();
    setEventId(event.id);
    setStep(1);
  }

  return (
    <div className="wizard">
      <div className="wizard-top">
        <Stepper steps={STEPS} current={step} />
      </div>

      {step === 0 && (
        <Card icon="🎟️">
          <h2>Vamos começar pelo seu evento</h2>
          <p className="subtitle">É assim que os participantes vão reconhecer a campanha.</p>

          <Field label="Nome do evento" required>
            <Input
              placeholder="BTS – Sorteio Exclusivo"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
            />
          </Field>
          <Field label="Campanha" hint="Agrupa eventos relacionados, opcional.">
            <Input
              placeholder="BTS"
              value={form.campaign}
              onChange={(e) => update("campaign", e.target.value)}
            />
          </Field>
          <Field label="Endereço público" required hint="sorteios.asbrasil.com/e/seu-slug">
            <Input
              placeholder="bts-sorteio-exclusivo"
              value={form.slug}
              onChange={(e) => update("slug", e.target.value)}
            />
          </Field>
          <Field label="Descrição" hint="Aparece no topo da página pública.">
            <Input
              placeholder="Concorra a experiências exclusivas do show"
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
            />
          </Field>

          <div className="divider">
            <span>Tipo de sorteio</span>
          </div>
          <div className="mode-choice">
            <label className={`mode-option ${form.missionMode === "SIMPLE" ? "active" : ""}`}>
              <input
                type="radio"
                name="missionMode"
                checked={form.missionMode === "SIMPLE"}
                onChange={() => setForm((f) => ({ ...f, missionMode: "SIMPLE" }))}
              />
              <span>
                <strong>🎲 Simples</strong>
                <small>Participa direto, sem nenhuma barreira.</small>
              </span>
            </label>
            <label className={`mode-option ${form.missionMode === "MISSIONS" ? "active" : ""}`}>
              <input
                type="radio"
                name="missionMode"
                checked={form.missionMode === "MISSIONS"}
                onChange={() => setForm((f) => ({ ...f, missionMode: "MISSIONS" }))}
              />
              <span>
                <strong>🎯 Com missões</strong>
                <small>Só libera número/resultado após cumprir pré-requisitos.</small>
              </span>
            </label>
          </div>
          {form.missionMode === "MISSIONS" && (
            <p className="missions-hint">
              Depois de criar o evento, configure as missões em <strong>Editar → Tipo de sorteio →
              Gerenciar missões</strong>.
            </p>
          )}

          {error && <p className="error">{error}</p>}

          <div className="actions">
            <Button onClick={createEvent} disabled={!form.name || !form.slug || saving}>
              {saving ? "Criando…" : "Continuar →"}
            </Button>
          </div>
        </Card>
      )}

      {step === 1 && eventId && (
        <ThemeStep eventId={eventId} onDone={() => setStep(2)} onBack={() => setStep(0)} />
      )}
      {step === 2 && eventId && (
        <ParticipantsStep eventId={eventId} onDone={() => setStep(3)} onBack={() => setStep(1)} />
      )}
      {step === 3 && eventId && (
        <PrizesStep eventId={eventId} onDone={() => setStep(4)} onBack={() => setStep(2)} />
      )}
      {step === 4 && eventId && (
        <PublishStep eventId={eventId} slug={form.slug} onBack={() => setStep(3)} />
      )}

      <style>{`
        .wizard {
          max-width: 34rem;
        }
        .wizard-top {
          margin-bottom: 2.5rem;
        }
        h2 {
          margin: 0 0 0.35rem;
          font-family: var(--font-display, inherit);
        }
        .subtitle {
          color: var(--text-muted);
          font-size: 0.9rem;
          margin-bottom: 1.75rem;
        }
        .actions {
          margin-top: 1.5rem;
          display: flex;
          gap: 0.75rem;
          flex-wrap: wrap;
        }
        .error {
          color: #c0392b;
          font-size: 0.85rem;
        }
        .divider {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin: 1.5rem 0 1.1rem;
          font-size: 0.75rem;
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
        .mode-choice {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
        }
        .mode-option {
          display: flex;
          align-items: flex-start;
          gap: 0.6rem;
          padding: 0.85rem 1rem;
          border: 1px solid var(--border);
          border-radius: 0.6rem;
          cursor: pointer;
        }
        .mode-option.active {
          border-color: var(--indigo-600);
          background: color-mix(in srgb, var(--indigo-600) 6%, var(--surface));
        }
        .mode-option input {
          margin-top: 0.2rem;
          flex-shrink: 0;
        }
        .mode-option span {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
        }
        .mode-option small {
          color: var(--text-muted);
          font-size: 0.8rem;
        }
        .missions-hint {
          font-size: 0.82rem;
          color: var(--text-muted);
          margin: 0.75rem 0 0;
        }
      `}</style>
    </div>
  );
}
