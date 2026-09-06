"use client";

import { useState } from "react";
import { Button, Field, Input } from "@/components/ui/primitives";

interface Tester {
  email: string;
  createdAt: string;
}

export function GameTesterManager({ testers: initialTesters }: { testers: Tester[] }) {
  const [testers, setTesters] = useState(initialTesters);
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    fetch("/api/admin/game-testers")
      .then((r) => r.json())
      .then((d) => setTesters(d.testers ?? []));
  }

  async function addTester() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) return;
    setError(null);
    setSaving(true);
    const res = await fetch("/api/admin/game-testers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: trimmed }),
    });
    setSaving(false);
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      setError(b.error || "Não deu pra adicionar.");
      return;
    }
    setEmail("");
    refresh();
  }

  return (
    <div className="wrap">
      <div className="card">
        <Field label="Adicionar testador" hint="O e-mail precisa ser o mesmo usado pra ver os números no sorteio.">
          <div className="add-row">
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="pessoa@email.com"
              onKeyDown={(e) => e.key === "Enter" && addTester()}
            />
            <Button onClick={addTester} disabled={saving || !email.trim()}>
              {saving ? "Adicionando…" : "Adicionar"}
            </Button>
          </div>
        </Field>
        {error && <p className="error">{error}</p>}
      </div>

      <div className="list">
        {testers.map((tester) => (
          <div key={tester.email} className="row">
            <span className="email">{tester.email}</span>
            <button
              type="button"
              className="delete-btn"
              onClick={async () => {
                await fetch(`/api/admin/game-testers/${encodeURIComponent(tester.email)}`, {
                  method: "DELETE",
                });
                refresh();
              }}
            >
              Remover
            </button>
          </div>
        ))}
        {testers.length === 0 && <p className="empty">Nenhum testador adicionado ainda.</p>}
      </div>

      <style jsx>{`
        .wrap {
          max-width: 32rem;
        }
        .card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 0.75rem;
          padding: 1.1rem 1.25rem;
          margin-bottom: 1rem;
        }
        .add-row {
          display: flex;
          gap: 0.5rem;
        }
        .error {
          color: #c0392b;
          font-size: 0.85rem;
          margin: 0.5rem 0 0;
        }
        .list {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 0.6rem;
          padding: 0.6rem 0.9rem;
        }
        .email {
          font-size: 0.88rem;
        }
        .delete-btn {
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.3rem 0.7rem;
          border-radius: 999px;
          border: 1px solid var(--border);
          background: none;
          color: #c0392b;
          cursor: pointer;
        }
        .empty {
          color: var(--text-muted);
          font-size: 0.9rem;
        }
      `}</style>
    </div>
  );
}
