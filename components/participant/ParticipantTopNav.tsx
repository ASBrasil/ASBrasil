"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navLinkBase: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "0.4rem",
  textDecoration: "none",
  borderRadius: "999px",
  padding: "0.48rem 1.05rem",
  fontWeight: 700,
  fontSize: "0.8rem",
  whiteSpace: "nowrap",
  transition: "border-color 0.15s, background 0.15s",
};

const PRIMARY_LINKS = [
  { href: "/meus-eventos", label: "Eventos" },
  { href: "/universo-as", label: "Universo AS" },
  { href: "/conquistas", label: "Conquistas" },
];

const SECONDARY_LINKS = [
  { href: "/vencedores", label: "Vencedores" },
  { href: "/perfil", label: "Meu perfil" },
];

/**
 * Topo compartilhado de todas as páginas do participante. `eventName` é
 * opcional - páginas "gerais" (home, Universo AS, Conquistas) não têm um
 * evento único como contexto, só páginas de um sorteio específico (/e/[slug])
 * passam isso.
 */
export function ParticipantTopNav({ eventName }: { eventName?: string }) {
  const pathname = usePathname();

  return (
    <header className="topnav">
      <Link
        href="/meus-eventos"
        className="brand"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.4rem",
          textDecoration: "none",
          color: "#fff",
          fontWeight: 800,
          fontSize: "0.85rem",
          letterSpacing: "0.03em",
          justifySelf: "start",
        }}
      >
        <span aria-hidden style={{ color: "var(--primary, #4f5fff)" }}>
          ●
        </span>
        AS BRASIL
      </Link>

      <nav className="center-nav">
        {PRIMARY_LINKS.map((link) => {
          const active = pathname === link.href || pathname?.startsWith(link.href + "/");
          return (
            <Link
              key={link.href}
              href={link.href}
              style={{
                ...navLinkBase,
                color: active ? "#12121a" : "#fff",
                background: active
                  ? "linear-gradient(135deg, var(--primary, #4f5fff), color-mix(in srgb, var(--primary, #4f5fff) 100%, black 28%))"
                  : "transparent",
                border: active ? "none" : "1px solid rgba(255, 255, 255, 0.2)",
              }}
            >
              {link.label}
            </Link>
          );
        })}

        <span className="nav-divider" aria-hidden />

        {SECONDARY_LINKS.map((link) => (
          <Link key={link.href} href={link.href} className="secondary-link">
            {link.label}
          </Link>
        ))}
      </nav>

      <div className="right">
        {eventName && <span className="current">{eventName}</span>}
        {/* Separado dos links do sistema de sorteios porque é outro produto
            (app de reservas) - misturado junto com Vencedores/Meu perfil
            dava a impressão de pertencer a este sistema. */}
        <a
          href="https://app.asbrasil.tur.br/"
          target="_blank"
          rel="noopener noreferrer"
          className="reservas-link"
        >
          Minhas reservas ↗
        </a>
        <form action="/api/public/session" method="post">
          <button className="logout">Sair</button>
        </form>
      </div>

      <style jsx>{`
        .topnav {
          position: sticky;
          top: 0;
          z-index: 40;
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem 1.5rem;
          background: rgba(8, 12, 30, 0.72);
          backdrop-filter: blur(14px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        }
        .brand {
          justify-self: start;
        }
        .center-nav {
          justify-self: center;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          flex-wrap: wrap;
          justify-content: center;
        }
        .nav-divider {
          width: 1px;
          height: 1.1rem;
          background: rgba(255, 255, 255, 0.15);
          margin: 0 0.15rem;
        }
        .secondary-link {
          display: inline-flex;
          align-items: center;
          color: inherit;
          text-decoration: none;
          background: none;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 999px;
          padding: 0.46rem 1.05rem;
          font-weight: 600;
          font-size: 0.8rem;
          white-space: nowrap;
          opacity: 0.9;
          transition: opacity 0.15s, border-color 0.15s;
        }
        .secondary-link:hover {
          opacity: 1;
          border-color: rgba(255, 255, 255, 0.45);
        }
        .right {
          justify-self: end;
          display: flex;
          align-items: center;
          gap: 0.9rem;
          min-width: 0;
        }
        .current {
          opacity: 0.65;
          font-size: 0.74rem;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          font-weight: 600;
          max-width: 10rem;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .reservas-link {
          color: inherit;
          text-decoration: none;
          font-size: 0.76rem;
          font-weight: 600;
          opacity: 0.6;
          white-space: nowrap;
          transition: opacity 0.15s;
        }
        .reservas-link:hover {
          opacity: 0.9;
        }
        .logout {
          background: none;
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: inherit;
          opacity: 0.85;
          border-radius: 999px;
          padding: 0.42rem 1rem;
          cursor: pointer;
          font-size: 0.78rem;
          flex-shrink: 0;
          transition: opacity 0.15s, border-color 0.15s;
        }
        .logout:hover {
          opacity: 1;
          border-color: rgba(255, 255, 255, 0.4);
        }

        @media (max-width: 860px) {
          .topnav {
            grid-template-columns: 1fr auto;
            grid-template-areas: "brand right" "nav nav";
            row-gap: 0.75rem;
          }
          .brand {
            grid-area: brand;
          }
          .right {
            grid-area: right;
          }
          .center-nav {
            grid-area: nav;
            justify-self: stretch;
            justify-content: flex-start;
            overflow-x: auto;
            flex-wrap: nowrap;
            padding-bottom: 0.15rem;
          }
          .nav-divider {
            flex-shrink: 0;
          }
          .current {
            display: none;
          }
          .reservas-link {
            display: none;
          }
        }
      `}</style>
    </header>
  );
}
