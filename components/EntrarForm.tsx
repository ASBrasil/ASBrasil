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
      <label className="field-label" htmlFor="entrar-email">
        E-mail
      </label>
      <input
        id="entrar-email"
        type="email"
        required
        placeholder="seu@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      {message && <p className="message">{message}</p>}

      <button type="submit" disabled={loading}>
        {loading ? "Verificando…" : "Continuar →"}
      </button>

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
          color: rgba(255, 255, 255, 0.85);
          font-size: 0.82rem;
          font-weight: 600;
          margin-bottom: 0.5rem;
        }
        input {
          width: 100%;
          box-sizing: border-box;
          padding: 0.8rem 1rem;
          border-radius: 0.75rem;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.96);
          margin-bottom: 1.1rem;
          font-size: 16px; /* abaixo disso, Safari no iPhone dá zoom automático ao focar o campo */
          color: #12121a;
        }
        input::placeholder {
          color: #9ca3af;
        }
        .message {
          font-size: 0.85rem;
          color: #fca5a5;
          margin: -0.5rem 0 1rem;
        }
        button {
          padding: 0.85rem;
          border-radius: 999px;
          border: none;
          background: linear-gradient(135deg, #4f5fff, #7c5cff);
          color: white;
          font-weight: 700;
          letter-spacing: 0.02em;
          cursor: pointer;
          font-size: 0.95rem;
          box-shadow: 0 0.5rem 1.5rem rgba(79, 95, 255, 0.35);
          transition: filter 0.15s;
        }
        button:hover:not(:disabled) {
          filter: brightness(1.08);
        }
        button:disabled {
          opacity: 0.6;
          cursor: default;
        }
        .support {
          margin-top: 1.75rem;
          padding-top: 1.25rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        .support p {
          margin: 0;
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.55);
          line-height: 1.5;
        }
        .support p:first-child {
          font-weight: 600;
          color: rgba(255, 255, 255, 0.85);
          margin-bottom: 0.2rem;
        }
        .support a {
          color: #a5b4ff;
          font-weight: 600;
          text-decoration: none;
        }
        .support a:hover {
          text-decoration: underline;
        }
      `}</style>
    </form>
  );
}
