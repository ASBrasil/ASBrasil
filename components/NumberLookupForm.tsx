"use client";

import { useState } from "react";

export function NumberLookupForm({ slug }: { slug: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<
    | { status: "idle" }
    | { status: "loading" }
    | { status: "found"; name: string; raffleNumber: number }
    | { status: "not-found"; message: string }
    | { status: "error"; message: string }
  >({ status: "idle" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState({ status: "loading" });
    try {
      const res = await fetch("/api/public/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setState({ status: "error", message: data.error ?? "Algo deu errado. Tente novamente." });
        return;
      }
      if (data.found) {
        setState({ status: "found", name: data.name, raffleNumber: data.raffleNumber });
      } else {
        setState({ status: "not-found", message: data.message });
      }
    } catch {
      setState({ status: "error", message: "Não foi possível conectar. Tente novamente." });
    }
  }

  return (
    <div className="lookup-card">
      <h2>Consulte seu número da sorte</h2>
      <p className="lookup-hint">Informe o e-mail usado na inscrição.</p>
      <form onSubmit={handleSubmit} className="lookup-form">
        <input
          type="email"
          required
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <button type="submit" disabled={state.status === "loading"}>
          {state.status === "loading" ? "Consultando…" : "Consultar"}
        </button>
      </form>

      {state.status === "found" && (
        <div className="lookup-result found">
          <p>
            Olá, {state.name}! Seu número de sorteio é:
          </p>
          <strong className="raffle-number">{state.raffleNumber}</strong>
          <p className="lookup-fineprint">
            Este número é pessoal, único e permanece válido durante toda a campanha.
          </p>
        </div>
      )}
      {state.status === "not-found" && <p className="lookup-result">{state.message}</p>}
      {state.status === "error" && <p className="lookup-result error">{state.message}</p>}

      <style jsx>{`
        .lookup-card {
          background: var(--surface, #1b1b26);
          border: 1px solid color-mix(in srgb, var(--primary, #e8b646) 25%, transparent);
          border-radius: 1rem;
          padding: 1.75rem;
          max-width: 26rem;
        }
        h2 {
          margin: 0 0 0.25rem;
          font-family: var(--font-display, serif);
          font-size: 1.4rem;
          color: var(--text, #f5f0e6);
        }
        .lookup-hint {
          margin: 0 0 1rem;
          opacity: 0.7;
          font-size: 0.9rem;
        }
        .lookup-form {
          display: flex;
          gap: 0.5rem;
        }
        input {
          flex: 1;
          padding: 0.65rem 0.8rem;
          border-radius: 0.5rem;
          border: 1px solid rgba(255, 255, 255, 0.15);
          background: rgba(255, 255, 255, 0.04);
          color: var(--text, #f5f0e6);
        }
        button {
          padding: 0.65rem 1.1rem;
          border-radius: 0.5rem;
          border: none;
          background: var(--primary, #e8b646);
          color: #12121a;
          font-weight: 600;
          cursor: pointer;
        }
        button:disabled {
          opacity: 0.6;
          cursor: default;
        }
        .lookup-result {
          margin-top: 1.1rem;
          font-size: 0.95rem;
        }
        .raffle-number {
          display: block;
          font-family: var(--font-mono, monospace);
          font-size: 2.5rem;
          letter-spacing: 0.05em;
          color: var(--primary, #e8b646);
          margin: 0.35rem 0;
        }
        .lookup-fineprint {
          opacity: 0.6;
          font-size: 0.8rem;
        }
        .error {
          color: #e08a8a;
        }
      `}</style>
    </div>
  );
}
