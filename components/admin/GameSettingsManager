"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Field, Input } from "@/components/ui/primitives";

/**
 * Editar nome/slug e excluir o jogo inteiro - faltava na tela de detalhe,
 * que só tinha edição de tema e das fases. Evento e tipo do jogo não têm
 * edição aqui de propósito: mudar o evento de um jogo que já tem progresso
 * registrado (PlayerPhaseProgress, tickets extras concedidos) é uma
 * operação arriscada o suficiente pra não expor num formulário casual.
 */
export function GameSettingsManager({
  gameId,
  name: initialName,
  slug: initialSlug,
}: {
  gameId: string;
  name: string;
  slug: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [slug, setSlug] = useState(initialSlug);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const dirty = name.trim() !== initialName || slug.trim() !== initialSlug;

  async function save() {
    setError(null);
    setSaved(false);
    setSaving(true);
    const res = await fetch(`/api/admin/games/${gameId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), slug: slug.trim() }),
    });
    setSaving(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error || "Não deu pra salvar.");
      return;
    }
    setSaved(true);
    router.refresh();
  }

  async function deleteGame() {
    if (
      !confirm(
        `Excluir o jogo "${initialName}"? Isso apaga as fases dele e o progresso já registrado dos jogadores. Não dá pra desfazer.`
      )
    ) {
      return;
    }
    setDeleting(true);
    const res = await fetch(`/api/admin/games/${gameId}`, { method: "DELETE" });
    if (!res.ok) {
      setDeleting(false);
      setError("Não deu pra excluir o jogo.");
      return;
    }
    router.push("/admin/jogos");
    router.refresh();
  }

  return (
    <div className="card">
      <h2>Configurações</h2>

      <Field label="Nome do jogo" required>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Slug" required hint="Usado na URL do jogo - só letras minúsculas, números e hífen.">
        <Input
          value={slug}
          onChange={(e) =>
            setSlug(
              e.target.value
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, "-")
                .replace(/(^-|-$)/g, "")
            )
          }
        />
      </Field>

      {error && <p className="error">{error}</p>}
      {saved && !dirty && <p className="ok">Salvo.</p>}

      <div className="actions">
        <Button onClick={save} disabled={saving || !dirty || !name.trim() || !slug.trim()}>
          {saving ? "Salvando…" : "Salvar alterações"}
        </Button>
        <button type="button" className="delete-link" onClick={deleteGame} disabled={deleting}>
          {deleting ? "Excluindo…" : "Excluir jogo"}
        </button>
      </div>

      <style jsx>{`
        .card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 0.75rem;
          padding: 1.25rem 1.5rem 1.5rem;
          margin-bottom: 1.5rem;
          max-width: 28rem;
        }
        h2 {
          margin: 0 0 1rem;
          font-size: 1rem;
          font-family: var(--font-display, inherit);
        }
        .error {
          color: #c0392b;
          font-size: 0.85rem;
          margin: -0.4rem 0 0.9rem;
        }
        .ok {
          color: #16a34a;
          font-size: 0.85rem;
          margin: -0.4rem 0 0.9rem;
        }
        .actions {
          display: flex;
          align-items: center;
          gap: 1.1rem;
          margin-top: 0.4rem;
        }
        .delete-link {
          background: none;
          border: none;
          color: #c0392b;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          padding: 0;
        }
        .delete-link:hover {
          text-decoration: underline;
        }
        .delete-link:disabled {
          opacity: 0.6;
          cursor: default;
        }
      `}</style>
    </div>
  );
}
