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
      <div className="icon">✉️</div>
      <h2>Digite o seu e-mail e acompanhe</h2>
      <p className="hint">Sem senha — é só o e-mail usado na inscrição.</p>

      <input
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
          width: 22rem;
          max-width: 100%;
          display: flex;
          flex-direction: column;
        }
        .icon {
          width: 2.5rem;
          height: 2.5rem;
          border-radius: 0.75rem;
          background: rgba(79, 95, 255, 0.12);
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 1rem;
          font-size: 1.1rem;
        }
        h2 {
          margin: 0 0 0.25rem;
          font-size: 1.2rem;
        }
        .hint {
          color: #6b7280;
          font-size: 0.85rem;
          margin-bottom: 1.5rem;
        }
        input {
          width: 100%;
          box-sizing: border-box;
          padding: 0.7rem 0.9rem;
          border-radius: 0.6rem;
          border: 1px solid #e6e8f0;
          margin-bottom: 1rem;
          font-size: 16px; /* abaixo disso, Safari no iPhone dá zoom automático ao focar o campo */
        }
        .message {
          font-size: 0.85rem;
          color: #6b7280;
          margin: -0.4rem 0 1rem;
        }
        button {
          padding: 0.75rem;
          border-radius: 999px;
          border: none;
          background: #4f5fff;
          color: white;
          font-weight: 600;
          cursor: pointer;
        }
        button:disabled {
          opacity: 0.6;
          cursor: default;
        }
        .support {
          margin-top: 1.75rem;
          padding-top: 1.25rem;
          border-top: 1px solid #e6e8f0;
        }
        .support p {
          margin: 0;
          font-size: 0.8rem;
          color: #6b7280;
          line-height: 1.5;
        }
        .support p:first-child {
          font-weight: 600;
          color: #374151;
          margin-bottom: 0.2rem;
        }
        .support a {
          color: #4f5fff;
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
