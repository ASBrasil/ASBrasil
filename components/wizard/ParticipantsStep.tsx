"use client";

import { useState } from "react";
import { Button, Field, Input, Card } from "@/components/ui/primitives";

type Mapping = { name: string; email: string; orderNumber?: string; phone?: string; cpf?: string };

export function ParticipantsStep({ eventId, onDone }: { eventId: string; onDone: () => void }) {
  const [method, setMethod] = useState<"import" | "signup" | null>(null);

  // --- import sub-flow ---
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[] | null>(null);
  const [mapping, setMapping] = useState<Mapping>({ name: "", email: "" });
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    validRows: number;
    errorRows: number;
    sampleErrors: { row: number; reason: string }[];
  } | null>(null);

  // --- signup sub-flow ---
  const [signupSaving, setSignupSaving] = useState(false);

  async function handleFile(f: File) {
    setFile(f);
    setResult(null);
    const form = new FormData();
    form.append("file", f);
    form.append("eventId", eventId);
    form.append("mode", "peek");
    const res = await fetch("/api/admin/participants/import", { method: "POST", body: form });
    const data = await res.json();
    setHeaders(data.headers ?? []);
  }

  async function commitImport() {
    if (!file) return;
    setImporting(true);
    const form = new FormData();
    form.append("file", file);
    form.append("eventId", eventId);
    form.append("mode", "commit");
    form.append("mapping", JSON.stringify(mapping));
    const res = await fetch("/api/admin/participants/import", { method: "POST", body: form });
    const data = await res.json();
    setImporting(false);
    setResult(data.result);
  }

  async function enableSignup() {
    setSignupSaving(true);
    await fetch(`/api/admin/events/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        publicSignupEnabled: true,
        signupFields: [
          { key: "name", label: "Nome", required: true },
          { key: "email", label: "E-mail", required: true },
          { key: "orderNumber", label: "Número do pedido", required: false },
        ],
      }),
    });
    setSignupSaving(false);
    onDone();
  }

  if (!method) {
    return (
      <Card icon="👥">
        <h2>Como os participantes vão entrar?</h2>
        <p className="subtitle">Você pode combinar os dois métodos depois, se precisar.</p>
        <div className="method-choice">
          <button className="method" onClick={() => setMethod("import")}>
            <strong>Importar planilha</strong>
            <span>XLSX ou CSV, até 10.000+ participantes de uma vez.</span>
          </button>
          <button className="method" onClick={() => setMethod("signup")}>
            <strong>Inscrição pública</strong>
            <span>O próprio cliente se cadastra pela página do evento.</span>
          </button>
        </div>
        <style jsx>{`
          h2 {
            margin: 0 0 0.35rem;
          }
          .subtitle {
            color: var(--text-muted);
            font-size: 0.9rem;
            margin-bottom: 1.5rem;
          }
          .method-choice {
            display: grid;
            gap: 0.75rem;
          }
          .method {
            text-align: left;
            border: 1px solid var(--border);
            border-radius: 0.75rem;
            padding: 1rem 1.2rem;
            cursor: pointer;
            background: var(--surface);
          }
          .method:hover {
            border-color: var(--indigo-600);
          }
          .method strong {
            display: block;
            margin-bottom: 0.2rem;
          }
          .method span {
            font-size: 0.85rem;
            color: var(--text-muted);
          }
        `}</style>
      </Card>
    );
  }

  if (method === "signup") {
    return (
      <Card icon="📝">
        <h2>Inscrição pública ativada</h2>
        <p className="subtitle">
          Nome, e-mail e número do pedido serão pedidos na página do evento. Você pode ajustar os
          campos depois no painel.
        </p>
        <div className="actions">
          <Button variant="ghost" onClick={() => setMethod(null)}>
            ← Voltar
          </Button>
          <Button onClick={enableSignup} disabled={signupSaving}>
            {signupSaving ? "Salvando…" : "Continuar →"}
          </Button>
        </div>
        <style jsx>{`
          h2 { margin: 0 0 0.35rem; }
          .subtitle { color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1.5rem; }
          .actions { display: flex; gap: 0.75rem; margin-top: 1rem; }
        `}</style>
      </Card>
    );
  }

  return (
    <Card icon="📄">
      <h2>Importar participantes</h2>
      <p className="subtitle">Envie a planilha e depois mapeie as colunas.</p>

      {!headers && (
        <Field label="Arquivo" required hint="XLSX ou CSV">
          <input
            type="file"
            accept=".xlsx,.csv"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
        </Field>
      )}

      {headers && !result && (
        <>
          <div className="mapping-grid">
            <Field label="Nome" required>
              <select value={mapping.name} onChange={(e) => setMapping({ ...mapping, name: e.target.value })}>
                <option value="">Selecione a coluna</option>
                {headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </Field>
            <Field label="E-mail" required>
              <select value={mapping.email} onChange={(e) => setMapping({ ...mapping, email: e.target.value })}>
                <option value="">Selecione a coluna</option>
                {headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </Field>
            <Field label="Número do pedido" hint="Opcional">
              <select
                value={mapping.orderNumber ?? ""}
                onChange={(e) => setMapping({ ...mapping, orderNumber: e.target.value || undefined })}
              >
                <option value="">Não usar</option>
                {headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </Field>
            <Field label="Telefone" hint="Opcional">
              <select
                value={mapping.phone ?? ""}
                onChange={(e) => setMapping({ ...mapping, phone: e.target.value || undefined })}
              >
                <option value="">Não usar</option>
                {headers.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </Field>
          </div>
          <div className="actions">
            <Button variant="ghost" onClick={() => setMethod(null)}>← Voltar</Button>
            <Button onClick={commitImport} disabled={!mapping.name || !mapping.email || importing}>
              {importing ? "Importando…" : "Importar e continuar →"}
            </Button>
          </div>
        </>
      )}

      {result && (
        <div className="result">
          <p className="summary">
            <strong>{result.validRows}</strong> participantes importados com sucesso.
            {result.errorRows > 0 && <> {result.errorRows} linhas com problema, ignoradas.</>}
          </p>
          {result.sampleErrors.length > 0 && (
            <ul className="errors">
              {result.sampleErrors.slice(0, 5).map((e, i) => (
                <li key={i}>Linha {e.row}: {e.reason}</li>
              ))}
            </ul>
          )}
          <div className="actions">
            <Button onClick={onDone}>Continuar →</Button>
          </div>
        </div>
      )}

      <style jsx>{`
        h2 { margin: 0 0 0.35rem; }
        .subtitle { color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1.5rem; }
        .mapping-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem 1rem; }
        select {
          padding: 0.6rem 0.7rem;
          border-radius: 0.5rem;
          border: 1px solid var(--border);
        }
        .actions { display: flex; gap: 0.75rem; margin-top: 1.5rem; }
        .result .summary { font-size: 0.95rem; }
        .errors { font-size: 0.8rem; color: var(--text-muted); }
      `}</style>
    </Card>
  );
}
