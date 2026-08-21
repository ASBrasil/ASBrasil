"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Stepper } from "@/components/ui/Stepper";
import { Button, Field, Input, Card } from "@/components/ui/primitives";
import { ThemeStep } from "@/components/wizard/ThemeStep";
import { ParticipantsStep } from "@/components/wizard/ParticipantsStep";
import { PrizesStep } from "@/components/wizard/PrizesStep";

const STEPS = ["Detalhes", "Tema", "Participantes", "Prêmios", "Concluir"];

interface EditableEvent {
  id: string;
  name: string;
  campaign: string;
  slug: string;
  description: string;
  active: boolean;
  archived: boolean;
  global: boolean;
  vip: boolean;
  prerequisiteText: string;
  heroFeatured: boolean;
  missionMode: "SIMPLE" | "MISSIONS";
  publicSignupEnabled: boolean;
  signupFields: { key: string; label: string; required: boolean; type?: "text" | "photo" }[];
  requireSignupApproval: boolean;
  theme: { colors?: any; customCss?: string; bannerUrl?: string | null } | null;
  participantsCount: number;
  prizes: { id: string; name: string; imageUrl?: string | null }[];
}

export function EditEventWizard({ event }: { event: EditableEvent }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [published, setPublished] = useState(event.active);

  const [form, setForm] = useState({
    name: event.name,
    campaign: event.campaign,
    slug: event.slug,
    description: event.description,
    global: event.global,
    vip: event.vip,
    prerequisiteText: event.prerequisiteText,
    missionMode: event.missionMode,
  });

  function update(key: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function saveDetails() {
    setSaving(true);
    setError(null);
    const res = await fetch(`/api/admin/events/${event.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Não foi possível salvar.");
      return;
    }
    setStep(1);
  }

  async function finish() {
    setFinishing(true);
    await fetch(`/api/admin/events/${event.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: published }),
    });
    setFinishing(false);
    router.push(`/admin/events/${event.id}`);
  }

  const publicUrl =
    typeof window !== "undefined" ? `${window.location.origin}/e/${form.slug}` : `/e/${form.slug}`;

  return (
    <div className="wizard">
      <div className="wizard-top">
        <Stepper steps={STEPS} current={step} />
      </div>

      {step === 0 && (
        <Card icon="🎟️">
          <h2>Editar detalhes do evento</h2>
          <p className="subtitle">Esses dados aparecem para os participantes.</p>

          <Field label="Nome do evento" required>
            <Input value={form.name} onChange={(e) => update("name", e.target.value)} />
          </Field>
          <Field label="Campanha" hint="Agrupa eventos relacionados, opcional.">
            <Input value={form.campaign} onChange={(e) => update("campaign", e.target.value)} />
          </Field>
          <Field label="Endereço público" required hint="Mudar o slug quebra links já compartilhados.">
            <Input value={form.slug} onChange={(e) => update("slug", e.target.value)} />
          </Field>
          <Field label="Descrição">
            <Input value={form.description} onChange={(e) => update("description", e.target.value)} />
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
                onChange={() => setForm({ ...form, missionMode: "SIMPLE" })}
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
                onChange={() => setForm({ ...form, missionMode: "MISSIONS" })}
              />
              <span>
                <strong>🎯 Com missões</strong>
                <small>Só libera o número/resultado depois de cumprir pré-requisitos.</small>
              </span>
            </label>
          </div>
          {form.missionMode === "MISSIONS" && (
            <a href={`/admin/events/${event.id}/missoes`} className="missions-link">
              🎯 Gerenciar missões deste evento →
            </a>
          )}

          <div className="divider">
            <span>Visibilidade global</span>
          </div>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={form.global}
              onChange={(e) => setForm({ ...form, global: e.target.checked })}
            />
            <span>
              <strong>Visível globalmente</strong>
              <small>
                Aparece em "Mais sorteios" para qualquer pessoa com e-mail no nosso banco, mesmo
                sem ela ter ingresso neste evento.
              </small>
            </span>
          </label>
          {form.global && (
            <>
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={form.vip}
                  onChange={(e) => setForm({ ...form, vip: e.target.checked })}
                />
                <span>
                  <strong>💎 VIP</strong>
                  <small>Destaque visual premium na listagem (ex: clientes de camarote).</small>
                </span>
              </label>
              <Field
                label="Pré-requisito para participar"
                hint='Mostrado a quem clicar sem ter ingresso ainda. Ex: "Compre o produto X para participar".'
              >
                <textarea
                  className="textarea"
                  rows={3}
                  value={form.prerequisiteText}
                  onChange={(e) => update("prerequisiteText", e.target.value)}
                />
              </Field>
            </>
          )}

          {error && <p className="error">{error}</p>}

          <div className="actions">
            <Button onClick={saveDetails} disabled={!form.name || !form.slug || saving}>
              {saving ? "Salvando…" : "Continuar →"}
            </Button>
            <Button variant="ghost" onClick={() => setStep(1)}>
              Pular →
            </Button>
          </div>
        </Card>
      )}

      {step === 1 && (
        <ThemeStep
          eventId={event.id}
          initialTheme={event.theme ?? undefined}
          initialHeroFeatured={event.heroFeatured}
          onDone={() => setStep(2)}
          onBack={() => setStep(0)}
        />
      )}
      {step === 2 && (
        <ParticipantsStep
          eventId={event.id}
          existingCount={event.participantsCount}
          initialSignupFields={event.publicSignupEnabled ? event.signupFields : undefined}
          initialRequireApproval={event.requireSignupApproval}
          onDone={() => setStep(3)}
          onBack={() => setStep(1)}
        />
      )}
      {step === 3 && (
        <PrizesStep
          eventId={event.id}
          existingPrizes={event.prizes}
          onDone={() => setStep(4)}
          onBack={() => setStep(2)}
        />
      )}
      {step === 4 && (
        <Card icon="✅">
          <h2>Alterações salvas</h2>
          <p className="subtitle">
            A página pública é <strong>{publicUrl}</strong>.
          </p>
          <Field label="Status do evento">
            <select value={published ? "1" : "0"} onChange={(e) => setPublished(e.target.value === "1")}>
              <option value="1">Publicado</option>
              <option value="0">Rascunho (não visível ao público)</option>
            </select>
          </Field>
          <div className="actions">
            <Button variant="ghost" onClick={() => setStep(3)}>
              ← Voltar
            </Button>
            <Button onClick={finish} disabled={finishing}>
              {finishing ? "Salvando…" : "Concluir edição"}
            </Button>
          </div>
        </Card>
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
        select {
          padding: 0.6rem 0.7rem;
          border-radius: 0.5rem;
          border: 1px solid var(--border);
          width: 100%;
        }
        .divider {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin: 1.75rem 0 1.1rem;
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
        .checkbox-row {
          display: flex;
          align-items: flex-start;
          gap: 0.65rem;
          margin-bottom: 1rem;
          cursor: pointer;
        }
        .checkbox-row input {
          margin-top: 0.2rem;
          flex-shrink: 0;
        }
        .checkbox-row span {
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
        }
        .checkbox-row small {
          color: var(--text-muted);
          font-size: 0.8rem;
        }
        .mode-choice {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem;
          margin-bottom: 1rem;
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
        .missions-link {
          display: inline-block;
          margin: -0.5rem 0 1rem;
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--indigo-600);
          text-decoration: none;
        }
        .missions-link:hover {
          text-decoration: underline;
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
      `}</style>
    </div>
  );
}
