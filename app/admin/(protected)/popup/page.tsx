import { db } from "@/lib/db";
import { PopupManager } from "@/components/admin/PopupManager";

export const dynamic = "force-dynamic";

export default async function PopupAdminPage() {
  const popups = await db.popup.findMany({ orderBy: { updatedAt: "desc" } });

  return (
    <div>
      <div className="header">
        <span className="as-eyebrow">Configurações</span>
        <h1 className="as-title">Pop-up de aviso</h1>
        <p className="as-subtitle">
          Aparece pro participante assim que ele entra em "Meus eventos". Só um fica ativo por
          vez - ativar um desativa automaticamente qualquer outro.
        </p>
      </div>

      <PopupManager
        popups={popups.map((p) => ({ ...p, updatedAt: p.updatedAt.toISOString() }))}
      />

      <style>{`
        .header { margin-bottom: 1.75rem; max-width: 40rem; }
      `}</style>
    </div>
  );
}
