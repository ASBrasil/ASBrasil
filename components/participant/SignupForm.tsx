"use client";

import { useState } from "react";
import Link from "next/link";

interface SignupField {
  key: string;
  label: string;
  required: boolean;
  type?: "text" | "photo";
}

export function SignupForm({ slug, fields }: { slug: string; fields: SignupField[] }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    raffleNumber: number;
    alreadyRegistered?: boolean;
    pendingApproval?: boolean;
  } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const form = new FormData();
    form.append("slug", slug);
    for (const field of fields) {
      if (field.type === "photo") {
        const file = files[field.key];
        if (file) form.append(field.key, file);
      } else {
        form.append(field.key, values[field.key] ?? "");
      }
    }

    const res = await fetch("/api/public/signup", { method: "POST", body: form });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "Não foi possível concluir a inscrição. Tente de novo.");
      return;
    }
    setResult(data);
  }

  if (result) {
    return (
      <div className="result">
        <span className="check">{result.pendingApproval ? "⏳" : "✅"}</span>
        <h2>{result.alreadyRegistered ? "Você já estava participando!" : "Participação confirmada!"}</h2>
        <p className="number-label">Seu Número da Sorte:</p>
        <p className="number">#{String(result.raffleNumber).padStart(6, "0")}</p>
        {result.pendingApproval && (
          <p className="pending-note">
            Sua participação está em análise — nossa equipe vai conferir o comprovante enviado
            antes de confirmar seu número para o sorteio. Você já pode acompanhar o status em
            "Meus sorteios".
          </p>
        )}
        <Link
          href="/meus-eventos"
          className="cta"
          style={{
            display: "inline-block",
            background: "var(--primary)",
            color: "#12121a",
            textDecoration: "none",
            fontWeight: 700,
            padding: "0.7rem 1.5rem",
            borderRadius: "999px",
          }}
        >
          Ver meus sorteios →
        </Link>

        <style jsx>{`
          .result {
            text-align: center;
            padding: 2.5rem 1.5rem;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 1rem;
          }
          .check { font-size: 2.5rem; }
          h2 { font-family: "Sora", system-ui, sans-serif; margin: 0.75rem 0 1.5rem; }
          .number-label { opacity: 0.7; margin: 0 0 0.4rem; font-size: 0.9rem; }
          .number {
            font-family: var(--font-mono, monospace);
            font-size: 2rem;
            font-weight: 700;
            color: var(--primary);
            margin: 0 0 2rem;
            letter-spacing: 0.05em;
          }
          .pending-note {
            font-size: 0.85rem;
            opacity: 0.75;
            line-height: 1.6;
            max-width: 22rem;
            margin: -1rem auto 2rem;
          }
        `}</style>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="signup-form">
      {fields.map((field) => (
        <div key={field.key} className="field">
          <label>
            {field.label}
            {field.required && <span className="required">*</span>}
          </label>
          {field.type === "photo" ? (
            <label className="photo-input">
              {files[field.key] ? `📎 ${files[field.key]!.name}` : "📸 Escolher arquivo"}
              <input
                type="file"
                accept="image/*"
                required={field.required}
                onChange={(e) => setFiles({ ...files, [field.key]: e.target.files?.[0] ?? null })}
              />
            </label>
          ) : (
            <input
              type={field.key === "email" ? "email" : "text"}
              required={field.required}
              value={values[field.key] ?? ""}
              onChange={(e) => setValues({ ...values, [field.key]: e.target.value })}
            />
          )}
        </div>
      ))}

      {error && <p className="error">{error}</p>}

      <button type="submit" className="submit-btn" disabled={submitting}>
        {submitting ? "Enviando…" : "Confirmar participação"}
      </button>

      <style jsx>{`
        .signup-form {
          display: flex;
          flex-direction: column;
          gap: 1.35rem;
        }
        .field {
          display: flex;
          flex-direction: column;
          gap: 0.45rem;
        }
        label {
          font-size: 0.85rem;
          font-weight: 600;
        }
        .required {
          color: #f87171;
          margin-left: 0.2rem;
        }
        input[type="text"],
        input[type="email"] {
          padding: 0.85rem 1rem;
          border-radius: 0.6rem;
          border: 1px solid rgba(255, 255, 255, 0.15);
          background: rgba(255, 255, 255, 0.95);
          color: #12121a;
          font-size: 16px;
          transition: box-shadow 0.15s, border-color 0.15s;
        }
        input[type="text"]:focus,
        input[type="email"]:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 30%, transparent);
        }
        .photo-input {
          display: inline-block;
          text-align: center;
          padding: 1.1rem;
          border: 1.5px dashed rgba(255, 255, 255, 0.25);
          border-radius: 0.6rem;
          cursor: pointer;
          font-size: 0.9rem;
          font-weight: 600;
          transition: border-color 0.15s;
        }
        .photo-input:hover {
          border-color: rgba(255, 255, 255, 0.45);
        }
        .photo-input input {
          display: none;
        }
        .error {
          color: #fca5a5;
          font-size: 0.85rem;
          margin: 0;
        }
        .submit-btn {
          background: linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 100%, black 28%));
          color: #12121a;
          border: none;
          border-radius: 999px;
          padding: 1rem;
          font-weight: 700;
          font-size: 0.95rem;
          cursor: pointer;
          margin-top: 0.75rem;
          box-shadow: 0 0.5rem 1.5rem color-mix(in srgb, var(--primary) 35%, transparent);
          transition: transform 0.1s, opacity 0.2s;
        }
        .submit-btn:hover:not(:disabled) {
          opacity: 0.9;
        }
        .submit-btn:active:not(:disabled) {
          transform: scale(0.98);
        }
        .submit-btn:disabled {
          opacity: 0.6;
          cursor: default;
          box-shadow: none;
        }
      `}</style>
    </form>
  );
}
