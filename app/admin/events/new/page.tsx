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

  const [form, setForm] = useState({ name: "", campaign: "", slug: "", description: "" });

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

          {error && <p className="error">{error}</p>}

          <div className="actions">
            <Button onClick={createEvent} disabled={!form.name || !form.slug || saving}>
              {saving ? "Criando…" : "Continuar →"}
            </Button>
          </div>
        </Card>
      )}

      {step === 1 && eventId && <ThemeStep eventId={eventId} onDone={() => setStep(2)} />}
      {step === 2 && eventId && <ParticipantsStep eventId={eventId} onDone={() => setStep(3)} />}
      {step === 3 && eventId && <PrizesStep eventId={eventId} onDone={() => setStep(4)} />}
      {step === 4 && eventId && <PublishStep eventId={eventId} slug={form.slug} />}

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
        }
        .error {
          color: #c0392b;
          font-size: 0.85rem;
        }
      `}</style>
    </div>
  );
}
