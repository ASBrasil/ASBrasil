"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function EntrarForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const res = await fetch("/api/public/identify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setMessage(data.error ?? "Algo deu errado. Tente novamente.");
      return;
    }
    if (!data.found) {
      setMessage(data.message);
      return;
    }
    router.push("/meus-eventos");
  }

  return (
    <form onSubmit={handleSubmit} className="form">
      <label className="as-label field-label" htmlFor="entrar-email">
        E-mail
      </label>
      <input
        id="entrar-email"
        className="as-input"
        type="email"
        required
        placeholder="seu@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      {message && <p className="message">{message}</p>}

      <button type="submit" className="as-btn as-btn-primary submit-btn" disabled={loading}>
        {loading ? "Verificando…" : "Continuar →"}
      </button>

      <div className="as-divider" />
      <div className="support">
        <p>Não conseguiu acessar?</p>
        <p>
          Fale com nosso time via SAC em horário comercial:{" "}
          <a href="tel:08008801117">0800 880 117</a> ou{" "}
          <a href="https://wa.me/558008801117" target="_blank" rel="noopener noreferrer">
            WhatsApp
          </a>
          .
        </p>
      </div>

      <style jsx>{`
        .form {
          margin-top: 1.5rem;
          display: flex;
          flex-direction: column;
        }
        .field-label {
          margin-bottom: 0.5rem;
        }
        .as-input {
          margin-bottom: 1.1rem;
          font-size: 16px; /* abaixo disso, Safari no iPhone dá zoom automático ao focar o campo */
        }
        .message {
          font-size: 0.85rem;
          color: var(--as-red, #fca5a5);
          margin: -0.5rem 0 1rem;
        }
        .submit-btn {
          width: 100%;
        }
        .support p {
          margin: 0;
          font-size: 0.8rem;
          color: var(--as-muted, rgba(255, 255, 255, 0.55));
          line-height: 1.5;
        }
        .support p:first-child {
          font-weight: 700;
          color: #dce5f7;
          margin-bottom: 0.25rem;
        }
        .support a {
          color: var(--as-cyan, #a5b4ff);
          font-weight: 700;
          text-decoration: none;
        }
        .support a:hover {
          text-decoration: underline;
        }
      `}</style>
    </form>
  );
}
