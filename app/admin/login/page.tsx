"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (!res.ok) {
      setError("E-mail ou senha inválidos.");
      return;
    }
    router.push("/admin/events");
  }

  return (
    <div className="split">
      <section className="panel-dark">
        <div className="brand">
          <strong>AS BRASIL</strong>
          <span>SISTEMA DE SORTEIOS</span>
        </div>
        <div className="pitch">
          <h1>Sorteios com a confiança que sua marca merece</h1>
          <p>Crie campanhas, importe participantes e conduza sorteios auditáveis do início ao fim.</p>
        </div>
      </section>

      <section className="panel-light">
        <form onSubmit={handleSubmit} className="login-form">
          <h2>Entrar no painel</h2>
          <p className="hint">Acesso restrito à equipe administradora.</p>

          <label>
            E-mail
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <label>
            Senha
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          {error && <p className="error">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "Entrando…" : "Continuar →"}
          </button>
        </form>
      </section>

      <style>{`
        .split {
          display: grid;
          grid-template-columns: 26rem 1fr;
          min-height: 100vh;
          font-family: var(--font-body, system-ui, sans-serif);
        }
        .panel-dark {
          background: linear-gradient(160deg, var(--navy-900, #0a1330), var(--navy-700, #1b2a5c));
          color: white;
          padding: 3rem 2.5rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .brand strong {
          display: block;
          letter-spacing: 0.05em;
        }
        .brand span {
          font-size: 0.7rem;
          opacity: 0.6;
        }
        .pitch h1 {
          font-size: 1.7rem;
          line-height: 1.3;
          margin-bottom: 0.75rem;
        }
        .pitch p {
          opacity: 0.75;
          font-size: 0.95rem;
        }
        .panel-light {
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg, #f7f8fb);
        }
        .login-form {
          width: 22rem;
          display: flex;
          flex-direction: column;
        }
        .login-form h2 {
          margin: 0 0 0.25rem;
        }
        .hint {
          color: var(--text-muted, #6b7280);
          font-size: 0.85rem;
          margin-bottom: 1.5rem;
        }
        label {
          font-size: 0.85rem;
          font-weight: 600;
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          margin-bottom: 1.1rem;
        }
        input {
          padding: 0.7rem 0.9rem;
          border-radius: 0.6rem;
          border: 1px solid var(--border, #e6e8f0);
          font-weight: 400;
        }
        button {
          margin-top: 0.5rem;
          padding: 0.75rem;
          border-radius: 999px;
          border: none;
          background: var(--indigo-600, #4f5fff);
          color: white;
          font-weight: 600;
          cursor: pointer;
        }
        .error {
          color: #c0392b;
          font-size: 0.85rem;
        }
      `}</style>
    </div>
  );
}
