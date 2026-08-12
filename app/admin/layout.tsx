import "../globals.css";
import { PropsWithChildren } from "react";

export default function AdminLayout({ children }: PropsWithChildren) {
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <strong>AS BRASIL</strong>
          <span>Sorteios</span>
        </div>
        <nav>
          <a href="/admin/events">Eventos</a>
          <a href="/admin/events/new">Novo evento</a>
        </nav>
        <div className="sidebar-footer">
          <form action="/api/admin/auth" method="post">
            <button formMethod="delete" className="logout">
              Sair
            </button>
          </form>
        </div>
      </aside>
      <main className="content">{children}</main>

      <style>{`
        .shell {
          display: grid;
          grid-template-columns: 15rem 1fr;
          min-height: 100vh;
        }
        .sidebar {
          background: linear-gradient(160deg, var(--navy-900), var(--navy-700));
          color: white;
          padding: 2rem 1.5rem;
          display: flex;
          flex-direction: column;
        }
        .brand {
          display: flex;
          flex-direction: column;
          margin-bottom: 3rem;
        }
        .brand strong {
          letter-spacing: 0.05em;
          font-size: 1rem;
        }
        .brand span {
          font-size: 0.75rem;
          opacity: 0.65;
        }
        nav {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          flex: 1;
        }
        nav a {
          color: rgba(255, 255, 255, 0.85);
          text-decoration: none;
          font-size: 0.9rem;
          padding: 0.5rem 0.75rem;
          border-radius: 0.5rem;
        }
        nav a:hover {
          background: rgba(255, 255, 255, 0.08);
        }
        .logout {
          background: transparent;
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: white;
          border-radius: 0.5rem;
          padding: 0.5rem 0.9rem;
          font-size: 0.85rem;
          cursor: pointer;
        }
        .content {
          padding: 3rem 3.5rem;
        }
      `}</style>
    </div>
  );
}
