import "../../globals.css";
import { PropsWithChildren } from "react";
import { AdminNav } from "@/components/admin/AdminNav";

// Menu lateral do admin: reescrito (28/09) pra resolver os dois achados
// registrados em claude/revisao-visual-paginas.md — 1) zero comportamento
// responsivo (shell fixo, quebra no celular) e 2) "Eventos" como rótulo
// confuso (o que existe dentro de uma Experiência são sorteios; "Jogos" é
// outra coisa). O colapso mobile é feito só em CSS (checkbox escondido +
// seletor de irmão), sem precisar de client component pro layout raiz — só
// o <AdminNav> (que precisa de usePathname pra destacar o item ativo) é
// client component.
export default function AdminLayout({ children }: PropsWithChildren) {
  return (
    <>
      <input type="checkbox" id="admin-nav-toggle" className="nav-toggle-input" />
      <div className="shell">
        <label htmlFor="admin-nav-toggle" className="scrim" aria-hidden="true" />

        <aside className="sidebar">
          <div className="sidebar-top">
            <div className="brand">
              <strong>AS BRASIL</strong>
              <span>Universo AS</span>
            </div>
            <label htmlFor="admin-nav-toggle" className="close-btn" aria-label="Fechar menu">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 5l14 14M19 5 5 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </label>
          </div>

          <AdminNav />

          <div className="sidebar-footer">
            <form action="/api/admin/logout" method="post">
              <button className="logout">Sair</button>
            </form>
          </div>
        </aside>

        <div className="content-area">
          <header className="mobile-topbar">
            <label htmlFor="admin-nav-toggle" className="hamburger" aria-label="Abrir menu">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3.5 6.5h17M3.5 12h17M3.5 17.5h17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </label>
            <strong>Universo AS</strong>
          </header>
          <main className="content">{children}</main>
        </div>
      </div>

      <style>{`
        .nav-toggle-input {
          display: none;
        }
        .shell {
          display: grid;
          grid-template-columns: 16rem 1fr;
          min-height: 100vh;
        }
        .scrim {
          display: none;
        }
        .sidebar {
          background: linear-gradient(160deg, var(--navy-900), var(--navy-700));
          color: white;
          padding: 1.75rem 1.25rem;
          display: flex;
          flex-direction: column;
        }
        .sidebar-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 2rem;
        }
        .brand {
          display: flex;
          flex-direction: column;
        }
        .brand strong {
          letter-spacing: 0.05em;
          font-size: 1rem;
        }
        .brand span {
          font-size: 0.75rem;
          opacity: 0.65;
        }
        .close-btn {
          display: none;
          color: rgba(255, 255, 255, 0.7);
          padding: 0.2rem;
          cursor: pointer;
        }
        .sidebar-footer {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }
        .logout {
          width: 100%;
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: white;
          border-radius: 0.5rem;
          padding: 0.5rem 0.9rem;
          font-size: 0.85rem;
          cursor: pointer;
        }
        .content-area {
          min-width: 0;
        }
        .mobile-topbar {
          display: none;
        }
        .content {
          padding: 3rem 3.5rem;
        }

        @media (max-width: 900px) {
          .shell {
            display: block;
          }
          .sidebar {
            position: fixed;
            top: 0;
            bottom: 0;
            left: 0;
            width: 17rem;
            max-width: 82vw;
            z-index: 60;
            transform: translateX(-100%);
            transition: transform 0.25s ease;
            overflow-y: auto;
          }
          .close-btn {
            display: inline-flex;
          }
          .mobile-topbar {
            display: flex;
            align-items: center;
            gap: 0.85rem;
            padding: 1rem 1.25rem;
            background: linear-gradient(160deg, var(--navy-900), var(--navy-700));
            color: white;
            position: sticky;
            top: 0;
            z-index: 40;
          }
          .hamburger {
            display: inline-flex;
            cursor: pointer;
          }
          .mobile-topbar strong {
            font-size: 0.95rem;
            letter-spacing: 0.03em;
          }
          .content {
            padding: 1.5rem 1.25rem 3rem;
          }
          .nav-toggle-input:checked ~ .shell .sidebar {
            transform: translateX(0);
          }
          .nav-toggle-input:checked ~ .shell .scrim {
            display: block;
            position: fixed;
            inset: 0;
            background: rgba(5, 8, 20, 0.55);
            z-index: 50;
          }
        }
      `}</style>
    </>
  );
}
