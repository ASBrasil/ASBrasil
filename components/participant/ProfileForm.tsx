"use client";

import { useState } from "react";

export function ProfileForm({
  initialName,
  initialPhone,
  initialDisplayName,
}: {
  initialName: string;
  initialPhone: string | null;
  initialDisplayName?: string | null;
}) {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [displayName, setDisplayName] = useState(initialDisplayName ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/public/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, phone: phone || null, displayName: displayName.trim() || null }),
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
        <label className="as-label">Nome</label>
        <input className="as-input" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label className="as-label">Telefone</label>
        <input className="as-input" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Opcional" />
      </div>
      <div className="field">
        <label className="as-label">Apelido / nome social</label>
        <input
          className="as-input"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Como você quer aparecer no ranking do Universo AS"
          maxLength={40}
        />
      </div>
      {error && <p className="error">{error}</p>}
      <div className="actions">
        <button type="button" className="as-btn as-btn-primary" onClick={save} disabled={saving || !name.trim()}>
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
        .as-input {
          font-size: 16px; /* abaixo disso, Safari no iPhone dá zoom automático ao focar o campo */
        }
        .error {
          color: var(--as-red, #fca5a5);
          font-size: 0.85rem;
          margin: 0;
        }
        .actions {
          display: flex;
          align-items: center;
          gap: 0.85rem;
        }
        .saved {
          font-size: 0.82rem;
          color: var(--as-green, #48e6a0);
          font-weight: 600;
        }
      `}</style>
    </div>
  );
}