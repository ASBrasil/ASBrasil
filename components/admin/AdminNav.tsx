"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PropsWithChildren, ReactNode } from "react";

// Ícones simples, próprios, no mesmo espírito do GameIcons.tsx (SVG com
// currentColor, sem emoji) — só que focados em navegação de admin, não em
// jogo. Ficam aqui (não em components/participant/GameIcons.tsx) porque são
// conceitos diferentes (cadeado, pessoas, sino...) e não fazem sentido
// misturados com os ícones de jogo.
function IconStarburst({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M12 2l1.9 5.4L19.5 9l-5.4 1.9L12 16.3l-1.9-5.4L4.5 9l5.4-1.6L12 2z"
        fill="currentColor"
      />
      <circle cx="19" cy="18" r="2" fill="currentColor" opacity="0.7" />
    </svg>
  );
}
function IconTicketStub({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={(size * 16) / 22} viewBox="0 0 22 16" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="1" width="20" height="14" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M13.5 1v14" stroke="currentColor" strokeWidth="1.4" strokeDasharray="1.8 1.8" />
    </svg>
  );
}
function IconController({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M6.5 8.5h11a4 4 0 0 1 3.9 4.9l-.7 3a3 3 0 0 1-5.3 1.2L14 16H10l-1.4 1.6a3 3 0 0 1-5.3-1.2l-.7-3a4 4 0 0 1 3.9-4.9z"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path d="M7.5 12h2.4M8.7 10.8v2.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="16" cy="11" r="0.9" fill="currentColor" />
      <circle cx="18" cy="13" r="0.9" fill="currentColor" />
    </svg>
  );
}
function IconPeople({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3.5 19c0-3 2.5-5 5.5-5s5.5 2 5.5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <circle cx="17" cy="8.5" r="2.3" stroke="currentColor" strokeWidth="1.5" opacity="0.75" />
      <path d="M15.5 19c.2-2.3 1.8-4 4-4.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.75" />
    </svg>
  );
}
function IconKey({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="8" cy="14.5" r="4" stroke="currentColor" strokeWidth="1.6" />
      <path d="M11.2 11.3 19 3.5M16.6 6l2 2M13.8 8.8l1.6 1.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
function IconBell({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 10.5a6 6 0 0 1 12 0c0 4 1.4 5.2 1.4 5.2H4.6S6 14.5 6 10.5z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M9.7 18.5a2.3 2.3 0 0 0 4.6 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
function IconSpotlight({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M9 3h6l2.5 7H6.5L9 3z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      <path d="M6.5 10 4 21M17.5 10 20 21" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M7.5 21h9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
function IconPlus({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

interface NavItem {
  href: string;
  label: string;
  icon: ReactNode;
  exact?: boolean;
}

// No mobile a sidebar é um "gaveta" controlada só por CSS (checkbox
// escondido em app/admin/(protected)/layout.tsx, id="admin-nav-toggle").
// Ao clicar num link, fechamos essa gaveta direto no DOM (sem precisar
// subir estado pro layout, que é Server Component) - assim navegar fecha o
// menu automaticamente, em vez de ficar aberto por cima da próxima página.
function closeMobileNav() {
  const toggle = document.getElementById("admin-nav-toggle") as HTMLInputElement | null;
  if (toggle) toggle.checked = false;
}

function NavLink({ item, action }: { item: NavItem; action?: ReactNode }) {
  const pathname = usePathname();
  const active = item.exact ? pathname === item.href : pathname === item.href || pathname?.startsWith(item.href + "/");
  return (
    <span className={`nav-row${active ? " active" : ""}`}>
      <Link href={item.href} className="nav-link" onClick={closeMobileNav}>
        <span className="nav-icon">{item.icon}</span>
        {item.label}
      </Link>
      {action}
    </span>
  );
}

function Group({ title, children, action }: PropsWithChildren<{ title: string; action?: ReactNode }>) {
  return (
    <div className="nav-group">
      <div className="nav-group-head">
        <span>{title}</span>
        {action}
      </div>
      {children}
      <style jsx>{`
        .nav-group {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }
        .nav-group-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 0.68rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: rgba(255, 255, 255, 0.45);
          padding: 0 0.75rem;
          margin: 0.9rem 0 0.35rem;
        }
      `}</style>
    </div>
  );
}

export function AdminNav() {
  return (
    <nav>
      <Group title="Universo AS">
        <NavLink item={{ href: "/admin/experiencias", label: "Experiências", icon: <IconStarburst /> }} />
        <NavLink
          item={{ href: "/admin/events", label: "Sorteios", icon: <IconTicketStub /> }}
          action={
            <Link href="/admin/events/new" className="add-btn" title="Novo sorteio" onClick={closeMobileNav}>
              <IconPlus />
            </Link>
          }
        />
        <NavLink item={{ href: "/admin/jogos", label: "Jogos", icon: <IconController /> }} />
      </Group>

      <Group title="Pessoas">
        <NavLink item={{ href: "/admin/clientes", label: "Clientes", icon: <IconPeople /> }} />
        <NavLink item={{ href: "/admin/acessos", label: "Acessos", icon: <IconKey /> }} />
      </Group>

      <Group title="Configurações">
        <NavLink item={{ href: "/admin/popup", label: "Pop-up de aviso", icon: <IconBell /> }} />
        <NavLink item={{ href: "/admin/destaques", label: "Destaques do login", icon: <IconSpotlight /> }} />
      </Group>

      <style jsx>{`
        nav {
          display: flex;
          flex-direction: column;
          flex: 1;
          overflow-y: auto;
        }
        :global(.nav-row) {
          display: flex;
          align-items: center;
          border-radius: 0.55rem;
        }
        :global(.nav-link) {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          flex: 1;
          min-width: 0;
          color: rgba(255, 255, 255, 0.78);
          text-decoration: none;
          font-size: 0.88rem;
          font-weight: 500;
          padding: 0.55rem 0.75rem;
          border-radius: 0.55rem;
        }
        :global(.nav-icon) {
          display: inline-flex;
          flex-shrink: 0;
          opacity: 0.85;
        }
        :global(.nav-row:hover) {
          background: rgba(255, 255, 255, 0.07);
        }
        :global(.nav-row:hover .nav-link) {
          color: white;
        }
        :global(.nav-row.active) {
          background: rgba(255, 255, 255, 0.12);
          box-shadow: inset 3px 0 0 var(--indigo-400, #8b9aff);
        }
        :global(.nav-row.active .nav-link) {
          color: white;
        }
        :global(.add-btn) {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 1.3rem;
          height: 1.3rem;
          border-radius: 999px;
          color: rgba(255, 255, 255, 0.55);
          background: rgba(255, 255, 255, 0.08);
        }
        :global(.add-btn:hover) {
          color: white;
          background: rgba(255, 255, 255, 0.16);
        }
      `}</style>
    </nav>
  );
}
