"use client";

import { useState } from "react";

export function ProfileForm({
  initialName,
  initialPhone,
}: {
  initialName: string;
  initialPhone: string | null;
}) {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/public/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone: phone || null }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Não foi possível salvar.");
      return;
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  return (
    <div className="form">
      <div className="field">
        <label>Nome</label>
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label>Telefone</label>
        <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Opcional" />
      </div>
      {error && <p className="error">{error}</p>}
      <div className="actions">
        <button type="button" onClick={save} disabled={saving || !name.trim()}>
          {saving ? "Salvando…" : "Salvar alterações"}
        </button>
        {saved && <span className="saved">Salvo ✓</span>}
      </div>

      <style jsx>{`
        .form {
          display: flex;
          flex-direction: column;
          gap: 1.1rem;
          max-width: 26rem;
        }
        .field {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
        }
        label {
          font-size: 0.85rem;
          font-weight: 600;
        }
        input {
          padding: 0.8rem 1rem;
          border-radius: 0.6rem;
          border: 1px solid rgba(255, 255, 255, 0.15);
          background: rgba(255, 255, 255, 0.95);
          color: #12121a;
          font-size: 16px;
        }
        input:focus {
          outline: none;
          border-color: var(--primary, #4f5fff);
        }
        .error {
          color: #fca5a5;
          font-size: 0.85rem;
          margin: 0;
        }
        .actions {
          display: flex;
          align-items: center;
          gap: 0.85rem;
        }
        button {
          background: linear-gradient(135deg, var(--primary, #4f5fff), color-mix(in srgb, var(--primary, #4f5fff) 100%, black 28%));
          color: #12121a;
          border: none;
          border-radius: 999px;
          padding: 0.75rem 1.5rem;
          font-weight: 700;
          font-size: 0.9rem;
          cursor: pointer;
        }
        button:disabled {
          opacity: 0.6;
          cursor: default;
        }
        .saved {
          font-size: 0.82rem;
          color: #16a34a;
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}
