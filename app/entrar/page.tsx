"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function EntrarPage() {
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
    <div className="split">
      <section className="panel-dark">
        <div className="brand">
          {/* espaço reservado para a logo / imagem da campanha, a ser definida depois */}
          <strong>AS BRASIL</strong>
          <span>SORTEIOS</span>
        </div>
        <div className="pitch">
          <h1>Acompanhe seus sorteios em um só lugar</h1>
          <p>
            Digite o e-mail que você usou na inscrição e veja seu número, os prêmios em disputa e
            os resultados de cada sorteio.
          </p>
        </div>
      </section>

      <section className="panel-light">
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
        </form>
      </section>

      <style>{`
        .split {
          display: grid;
          grid-template-columns: 26rem 1fr;
          min-height: 100vh;
          font-family: system-ui, sans-serif;
        }
        @media (max-width: 48rem) {
          .split {
            grid-template-columns: 1fr;
            min-height: auto;
          }
          .panel-dark {
            padding: 2.5rem 1.5rem 2rem;
          }
          .panel-light {
            padding: 2.5rem 1.5rem 3rem;
          }
        }
        .panel-dark {
          background: linear-gradient(160deg, #0a1330, #1b2a5c);
          color: white;
          padding: 3rem 2.5rem;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
        }
        .brand strong { display: block; letter-spacing: 0.05em; }
        .brand span { font-size: 0.7rem; opacity: 0.6; }
        .pitch h1 { font-size: 1.7rem; line-height: 1.3; margin-bottom: 0.75rem; }
        .pitch p { opacity: 0.75; font-size: 0.95rem; }
        .panel-light {
          display: flex;
          align-items: center;
          justify-content: center;
          background: #f7f8fb;
        }
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
        h2 { margin: 0 0 0.25rem; font-size: 1.2rem; }
        .hint { color: #6b7280; font-size: 0.85rem; margin-bottom: 1.5rem; }
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
        button:disabled { opacity: 0.6; cursor: default; }
      `}</style>
    </div>
  );
}
