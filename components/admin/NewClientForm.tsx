"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input } from "@/components/ui/primitives";

interface EventOption {
  id: string;
  name: string;
  campaign: string | null;
}

export function NewClientForm({ events }: { events: EventOption[] }) {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", phone: "", cpf: "", orderNumber: "" });
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ created: number; skipped: number } | null>(null);

  function toggleEvent(id: string) {
    setSelectedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/admin/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, eventIds: [...selectedEvents] }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(data.error ?? "Não foi possível cadastrar. Tente novamente.");
      return;
    }
    setResult(data);
  }

  if (result) {
    return (
      <div className="result-card">
        <p className="summary">
          <strong>{result.created}</strong>{" "}
          {result.created === 1 ? "número gerado" : "números gerados"}
          {result.skipped > 0 && (
            <>
              {" "}
              · {result.skipped}{" "}
              {result.skipped === 1 ? "evento ignorado" : "eventos ignorados"} (já estava
              cadastrado)
            </>
          )}
        </p>
        <div className="result-actions">
          <Button
            variant="ghost"
            onClick={() => {
              setForm({ name: "", email: "", phone: "", cpf: "", orderNumber: "" });
              setSelectedEvents(new Set());
              setResult(null);
            }}
          >
            + Adicionar outro cliente
          </Button>
          <Button onClick={() => router.push("/admin/clientes")}>Voltar para Clientes</Button>
        </div>
        <style jsx>{`
          .result-card {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 1rem;
            padding: 1.5rem;
            max-width: 32rem;
          }
          .summary {
            margin: 0 0 1.25rem;
            font-size: 0.95rem;
          }
          .result-actions {
            display: flex;
            gap: 0.75rem;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="form-card">
      <Field label="Nome" required>
        <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      </Field>
      <Field label="E-mail" required>
        <Input
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
      </Field>
      <div className="row">
        <Field label="Telefone" hint="Opcional">
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </Field>
        <Field label="CPF" hint="Opcional">
          <Input value={form.cpf} onChange={(e) => setForm({ ...form, cpf: e.target.value })} />
        </Field>
      </div>
      <Field label="Número do pedido" hint="Opcional">
        <Input
          value={form.orderNumber}
          onChange={(e) => setForm({ ...form, orderNumber: e.target.value })}
        />
      </Field>

      <div className="divider">
        <span>Eventos</span>
      </div>
      {events.length === 0 ? (
        <p className="empty">Nenhum evento ativo no momento.</p>
      ) : (
        <div className="event-list">
          {events.map((e) => (
            <label key={e.id} className="event-row">
              <input
                type="checkbox"
                checked={selectedEvents.has(e.id)}
                onChange={() => toggleEvent(e.id)}
              />
              <span>
                {e.campaign && <span className="campaign">{e.campaign}</span>}
                <span className="name">{e.name}</span>
              </span>
            </label>
          ))}
        </div>
      )}

      {error && <p className="error">{error}</p>}

      <div className="actions">
        <Button
          onClick={save}
          disabled={saving || !form.name || !form.email || selectedEvents.size === 0}
        >
          {saving ? "Cadastrando…" : "Cadastrar cliente"}
        </Button>
      </div>

      <style jsx>{`
        .form-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 1rem;
          padding: 1.75rem;
          max-width: 32rem;
        }
        .row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
        }
        .divider {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin: 1.5rem 0 1rem;
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
        .empty {
          color: var(--text-muted);
          font-size: 0.88rem;
        }
        .event-list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          max-height: 16rem;
          overflow-y: auto;
        }
        .event-row {
          display: flex;
          align-items: center;
          gap: 0.65rem;
          padding: 0.6rem 0.8rem;
          border: 1px solid var(--border);
          border-radius: 0.5rem;
          cursor: pointer;
          font-size: 0.88rem;
        }
        .event-row:hover {
          border-color: var(--indigo-600);
        }
        .campaign {
          display: block;
          font-size: 0.68rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--indigo-600);
        }
        .name {
          font-weight: 600;
        }
        .error {
          color: #c0392b;
          font-size: 0.85rem;
          margin: 1rem 0 0;
        }
        .actions {
          margin-top: 1.5rem;
        }
      `}</style>
    </div>
  );
}
