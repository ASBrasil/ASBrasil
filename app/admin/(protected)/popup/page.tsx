import { db } from "@/lib/db";
import { PopupManager } from "@/components/admin/PopupManager";

export const dynamic = "force-dynamic";

export default async function PopupAdminPage() {
  const popups = await db.popup.findMany({ orderBy: { updatedAt: "desc" } });

  return (
    <div>
      <div className="header">
        <h1>Pop-up de aviso</h1>
        <p className="subtitle">
          Aparece pro participante assim que ele entra em "Meus eventos". Só um fica ativo por
          vez - ativar um desativa automaticamente qualquer outro.
        </p>
      </div>

      <PopupManager
        popups={popups.map((p) => ({ ...p, updatedAt: p.updatedAt.toISOString() }))}
      />

      <style>{`
        .header { margin-bottom: 1.75rem; max-width: 40rem; }
        h1 { margin: 0 0 0.4rem; font-family: var(--font-display, inherit); }
        .subtitle { color: var(--text-muted); font-size: 0.9rem; margin: 0; }
      `}</style>
    </div>
  );
}
