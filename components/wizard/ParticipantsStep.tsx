"use client";

import { useEffect, useState } from "react";
import { Button, Field, Card } from "@/components/ui/primitives";

type Mapping = {
  name: string;
  email: string;
  orderNumber?: string;
  phone?: string;
  cpf?: string;
  ticketCode?: string;
};

interface EventOption {
  id: string;
  name: string;
  _count: { participants: number };
}

export function ParticipantsStep({
  eventId,
  onDone,
  onBack,
  existingCount = 0,
}: {
  eventId: string;
  onDone: () => void;
  onBack?: () => void;
  existingCount?: number;
}) {
  const [method, setMethod] = useState<"import" | "signup" | "copy" | null>(null);
  // Edit mode: if the event already has participants, don't force another
  // import/signup choice on every visit - show a summary first.
  const [showChoice, setShowChoice] = useState(existingCount === 0);

  // --- import sub-flow ---
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[] | null>(null);
  const [mapping, setMapping] = useState<Mapping>({ name: "", email: "" });
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    validRows: number;
    errorRows: number;
    sampleErrors: { row: number; reason: string }[];
  } | null>(null);

  // --- signup sub-flow ---
  const [signupSaving, setSignupSaving] = useState(false);
  const [signupExtras, setSignupExtras] = useState({
    phone: false,
    instagram: false,
    photo: false,
    orderNumber: true,
  });

  // --- copy-from-another-event sub-flow ---
  const [events, setEvents] = useState<EventOption[] | null>(null);
  const [sourceEventId, setSourceEventId] = useState("");
  const [copying, setCopying] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [copyResult, setCopyResult] = useState<{
    imported: number;
    skipped: number;
    sourceEventName: string;
  } | null>(null);

  // All hooks above run unconditionally on every render (Rules of Hooks) -
  // the conditional branches below only affect what gets returned. Loads
  // the event list lazily, only once the admin actually picks this method.
  useEffect(() => {
    if (method !== "copy" || events !== null) return;
    fetch("/api/admin/events")
      .then((r) => r.json())
      .then((d) => setEvents((d.events ?? []).filter((e: EventOption) => e.id !== eventId)));
  }, [method, events, eventId]);

  if (!showChoice && !method) {
    return (
      <Card icon="👥">
        <h2>Participantes já cadastrados</h2>
        <p className="subtitle">
          Este evento já tem <strong>{existingCount}</strong> participante(s). Você pode manter
          como está ou importar/habilitar mais.
        </p>
        <div className="actions">
          {onBack && (
            <Button variant="ghost" onClick={onBack}>
              ← Voltar
            </Button>
          )}
          <Button variant="ghost" onClick={() => setShowChoice(true)}>
            + Importar ou habilitar inscrição
          </Button>
          <Button onClick={onDone}>Continuar →</Button>
        </div>
        <style jsx>{`
          h2 { margin: 0 0 0.35rem; }
          .subtitle { color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1.5rem; }
          .actions { display: flex; gap: 0.75rem; margin-top: 1rem; flex-wrap: wrap; }
        `}</style>
      </Card>
    );
  }

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

  function resetFile() {
    setFile(null);
    setHeaders(null);
    setMapping({ name: "", email: "" });
    setResult(null);
    setImportError(null);
  }

  async function commitImport() {
    if (!file) return;
    setImporting(true);
    setImportError(null);
    const form = new FormData();
    form.append("file", file);
    form.append("eventId", eventId);
    form.append("mode", "commit");
    form.append("mapping", JSON.stringify(mapping));
    const res = await fetch("/api/admin/participants/import", { method: "POST", body: form });
    const data = await res.json();
    setImporting(false);
    if (!res.ok) {
      setImportError(data.error ?? "Não foi possível importar. Tente novamente.");
      return;
    }
    setResult(data.result);
  }

  async function enableSignup() {
    setSignupSaving(true);
    const fields: { key: string; label: string; required: boolean; type?: "text" | "photo" }[] = [
      { key: "name", label: "Nome", required: true },
      { key: "email", label: "E-mail", required: true },
    ];
    if (signupExtras.phone) fields.push({ key: "phone", label: "Telefone", required: false });
    if (signupExtras.instagram) {
      fields.push({ key: "instagram", label: "@ do Instagram", required: true });
    }
    if (signupExtras.orderNumber) {
      fields.push({ key: "orderNumber", label: "Número do pedido", required: false });
    }
    if (signupExtras.photo) {
      fields.push({ key: "photo", label: "Print/comprovante", required: true, type: "photo" });
    }

    await fetch(`/api/admin/events/${eventId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ publicSignupEnabled: true, signupFields: fields }),
    });
    setSignupSaving(false);
    onDone();
  }

  async function commitCopy() {
    if (!sourceEventId) return;
    setCopying(true);
    setCopyError(null);
    const res = await fetch("/api/admin/participants/import-from-event", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetEventId: eventId, sourceEventId }),
    });
    const data = await res.json();
    setCopying(false);
    if (!res.ok) {
      setCopyError(data.error ?? "Não foi possível importar. Tente novamente.");
      return;
    }
    setCopyResult(data);
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
          <button className="method" onClick={() => setMethod("copy")}>
            <strong>Importar de outro evento</strong>
            <span>Copia os participantes de um evento já existente, com números novos.</span>
          </button>
        </div>
        {existingCount > 0 ? (
          <div className="actions">
            <Button variant="ghost" onClick={() => setShowChoice(false)}>
              ← Voltar
            </Button>
          </div>
        ) : (
          <div className="actions">
            {onBack && (
              <Button variant="ghost" onClick={onBack}>
                ← Voltar
              </Button>
            )}
            <Button variant="ghost" onClick={onDone}>
              Pular por agora →
            </Button>
          </div>
        )}
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
          .actions {
            display: flex;
            gap: 0.75rem;
            margin-top: 1.25rem;
          }
        `}</style>
      </Card>
    );
  }

  if (method === "signup") {
    return (
      <Card icon="📝">
        <h2>Inscrição pública</h2>
        <p className="subtitle">
          Nome e e-mail sempre são pedidos. Marca quais campos extras essa campanha também precisa.
        </p>

        <div className="extras-list">
          <label className="extra-row">
            <input
              type="checkbox"
              checked={signupExtras.phone}
              onChange={(e) => setSignupExtras({ ...signupExtras, phone: e.target.checked })}
            />
            Telefone
          </label>
          <label className="extra-row">
            <input
              type="checkbox"
              checked={signupExtras.instagram}
              onChange={(e) => setSignupExtras({ ...signupExtras, instagram: e.target.checked })}
            />
            @ do Instagram
          </label>
          <label className="extra-row">
            <input
              type="checkbox"
              checked={signupExtras.orderNumber}
              onChange={(e) => setSignupExtras({ ...signupExtras, orderNumber: e.target.checked })}
            />
            Número do pedido
          </label>
          <label className="extra-row">
            <input
              type="checkbox"
              checked={signupExtras.photo}
              onChange={(e) => setSignupExtras({ ...signupExtras, photo: e.target.checked })}
            />
            📸 Print/comprovante (upload de imagem)
          </label>
        </div>

        <div className="actions">
          <Button
            variant="ghost"
            onClick={() => (existingCount > 0 ? setShowChoice(false) : setMethod(null))}
          >
            ← Voltar
          </Button>
          <Button onClick={enableSignup} disabled={signupSaving}>
            {signupSaving ? "Salvando…" : "Continuar →"}
          </Button>
        </div>
        <style jsx>{`
          h2 { margin: 0 0 0.35rem; }
          .subtitle { color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1.5rem; }
          .extras-list {
            display: flex;
            flex-direction: column;
            gap: 0.6rem;
            margin-bottom: 1rem;
          }
          .extra-row {
            display: flex;
            align-items: center;
            gap: 0.6rem;
            font-size: 0.9rem;
            padding: 0.6rem 0.85rem;
            border: 1px solid var(--border);
            border-radius: 0.5rem;
            cursor: pointer;
          }
          .actions { display: flex; gap: 0.75rem; margin-top: 1rem; }
        `}</style>
      </Card>
    );
  }

  if (method === "copy") {
    return (
      <Card icon="🔁">
        <h2>Importar de outro evento</h2>
        <p className="subtitle">
          Copia todos os participantes de um evento já existente pra este, com números de sorteio
          novos. Quem já estiver cadastrado aqui (mesmo e-mail) não duplica.
        </p>

        {!copyResult ? (
          <>
            <Field label="Evento de origem" required>
              <select
                value={sourceEventId}
                onChange={(e) => setSourceEventId(e.target.value)}
                disabled={!events}
              >
                <option value="">{events ? "Selecione o evento" : "Carregando…"}</option>
                {events?.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.name} ({ev._count.participants}{" "}
                    {ev._count.participants === 1 ? "participante" : "participantes"})
                  </option>
                ))}
              </select>
            </Field>

            {events?.length === 0 && (
              <p className="hint">Nenhum outro evento com participantes encontrado.</p>
            )}
            {copyError && <p className="error">{copyError}</p>}

            <div className="actions">
              <Button
                variant="ghost"
                onClick={() => (existingCount > 0 ? setShowChoice(false) : setMethod(null))}
              >
                ← Voltar
              </Button>
              <Button onClick={commitCopy} disabled={!sourceEventId || copying}>
                {copying ? "Importando…" : "Importar e continuar →"}
              </Button>
            </div>
          </>
        ) : (
          <div className="result">
            <p className="summary">
              <strong>{copyResult.imported}</strong>{" "}
              {copyResult.imported === 1 ? "participante importado" : "participantes importados"}{" "}
              de "{copyResult.sourceEventName}".
              {copyResult.skipped > 0 && (
                <> {copyResult.skipped} já estavam cadastrados aqui, ignorados.</>
              )}
            </p>
            <div className="actions">
              <Button
                variant="ghost"
                onClick={() => {
                  setCopyResult(null);
                  setSourceEventId("");
                }}
              >
                + Importar de outro evento
              </Button>
              <Button onClick={onDone}>Continuar →</Button>
            </div>
          </div>
        )}

        <style jsx>{`
          h2 { margin: 0 0 0.35rem; }
          .subtitle { color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1.5rem; }
          select {
            width: 100%;
            box-sizing: border-box;
            padding: 0.6rem 0.7rem;
            border-radius: 0.5rem;
            border: 1px solid var(--border);
            background: var(--surface);
            color: var(--text);
          }
          .hint { color: var(--text-muted); font-size: 0.82rem; margin-top: 0.5rem; }
          .actions { display: flex; gap: 0.75rem; margin-top: 1.5rem; }
          .error { color: #c0392b; font-size: 0.85rem; margin-top: 0.75rem; }
          .result .summary { font-size: 0.95rem; }
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
          <div className="file-chip">
            <span>📄 {file?.name}</span>
            <button type="button" className="swap" onClick={resetFile}>
              Trocar arquivo
            </button>
          </div>
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
            <Field
              label="Código do ingresso"
              hint="Opcional, mas recomendado se a planilha tiver um: permite reimportar o mesmo arquivo sem duplicar ninguém. Sem isso, cada linha vira um participante mesmo que o e-mail se repita."
            >
              <select
                value={mapping.ticketCode ?? ""}
                onChange={(e) => setMapping({ ...mapping, ticketCode: e.target.value || undefined })}
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
          {importError && <p className="error">{importError}</p>}
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
            <Button variant="ghost" onClick={resetFile}>
              + Importar outra planilha
            </Button>
            <Button onClick={onDone}>Continuar →</Button>
          </div>
        </div>
      )}

      <style jsx>{`
        h2 { margin: 0 0 0.35rem; }
        .subtitle { color: var(--text-muted); font-size: 0.9rem; margin-bottom: 1.5rem; }
        .file-chip {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.75rem;
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 0.6rem;
          padding: 0.6rem 0.9rem;
          margin-bottom: 1.25rem;
          font-size: 0.85rem;
        }
        .swap {
          background: none;
          border: none;
          color: var(--indigo-600);
          font-size: 0.8rem;
          font-weight: 600;
          cursor: pointer;
        }
        .mapping-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem 1rem; }
        select {
          padding: 0.6rem 0.7rem;
          border-radius: 0.5rem;
          border: 1px solid var(--border);
        }
        .actions { display: flex; gap: 0.75rem; margin-top: 1.5rem; }
        .error { color: #c0392b; font-size: 0.85rem; margin-top: 0.75rem; }
        .result .summary { font-size: 0.95rem; }
        .errors { font-size: 0.8rem; color: var(--text-muted); }
      `}</style>
    </Card>
  );
}
