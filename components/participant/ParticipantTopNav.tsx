"use client";

import { useEffect, useState } from "react";
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

// "Início" no lugar de "Eventos" - é a página inicial do participante
// (mesmo destino, /meus-eventos), só o rótulo/ícone que ficam mais claros
// sobre o que é essa aba.
const PRIMARY_LINKS = [
  { href: "/meus-eventos", label: "Início", icon: "🏠" },
  { href: "/universo-as", label: "Universo AS", icon: null },
  { href: "/conquistas", label: "Conquistas", icon: null },
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
 *
 * Em tela estreita, em vez do menu rolar de lado (o que não ficava claro que
 * dava pra rolar), ele recolhe tudo atrás de um botão de menu com um tom
 * diferente pra chamar atenção - mesmo padrão do app de reservas
 * (app.asbrasil.tur.br), que o Paulo usou de referência.
 */
export function ParticipantTopNav({ eventName }: { eventName?: string }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  // Fecha o menu sozinho quando a pessoa navega pra outra página - sem isso
  // ele ficaria aberto por cima do conteúdo da página seguinte.
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  const allLinks = [
    ...PRIMARY_LINKS.map((l) => ({ href: l.href, label: l.label })),
    ...SECONDARY_LINKS,
  ];

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
              {link.icon && <span aria-hidden>{link.icon}</span>}
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
        {/* Sino de notificações - por enquanto só um destino fixo (o
            perfil), sem contador nem lista ainda. É a base visual pra
            depois pendurar avisos de sorteio chegando/resultado saiu e o
            aviso de perfil incompleto, sem precisar mexer no menu de novo. */}
        <Link href="/perfil" className="bell" aria-label="Notificações">
          🔔
        </Link>
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
        <form action="/api/public/session" method="post" className="logout-form">
          <button className="logout">Sair</button>
        </form>

        {/* Botão de menu só aparece em tela estreita (ver media query) - tom
            claro de propósito, pra destacar contra a barra escura, igual a
            referência que o Paulo mandou. */}
        <button
          type="button"
          className={`menu-toggle ${menuOpen ? "open" : ""}`}
          aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span className="bar" />
          <span className="bar" />
          <span className="bar" />
        </button>
      </div>

      {menuOpen && (
        <div className="mobile-menu">
          {allLinks.map((link) => {
            const active = pathname === link.href || pathname?.startsWith(link.href + "/");
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`mobile-link ${active ? "active" : ""}`}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            );
          })}
          <a
            href="https://app.asbrasil.tur.br/"
            target="_blank"
            rel="noopener noreferrer"
            className="mobile-link"
          >
            Minhas reservas ↗
          </a>
          <form action="/api/public/session" method="post">
            <button className="mobile-link mobile-logout">Sair</button>
          </form>
        </div>
      )}

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
          gap: 0.7rem;
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
        .bell {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 2.15rem;
          height: 2.15rem;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.08);
          text-decoration: none;
          font-size: 0.95rem;
          flex-shrink: 0;
          transition: background 0.15s;
        }
        .bell:hover {
          background: rgba(255, 255, 255, 0.16);
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
        /* Escondido em tela larga - só o menu de cima é usado */
        .menu-toggle {
          display: none;
        }
        .mobile-menu {
          display: none;
        }

        @media (max-width: 860px) {
          .topnav {
            grid-template-columns: 1fr auto;
          }
          .center-nav,
          .secondary-link,
          .reservas-link,
          .current,
          .logout-form {
            display: none;
          }
          .right {
            gap: 0.5rem;
          }
          /* Botão de menu com tom claro de propósito, pra se destacar contra
             a barra escura - mesma ideia da referência (quadrado branco com
             as 3 tracinhos). */
          .menu-toggle {
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            gap: 0.24rem;
            width: 2.15rem;
            height: 2.15rem;
            border-radius: 0.6rem;
            border: none;
            background: #fff;
            cursor: pointer;
            flex-shrink: 0;
          }
          .menu-toggle .bar {
            width: 1.05rem;
            height: 2px;
            border-radius: 999px;
            background: #12121a;
            transition: transform 0.2s, opacity 0.2s;
          }
          .menu-toggle.open .bar:nth-child(1) {
            transform: translateY(6px) rotate(45deg);
          }
          .menu-toggle.open .bar:nth-child(2) {
            opacity: 0;
          }
          .menu-toggle.open .bar:nth-child(3) {
            transform: translateY(-6px) rotate(-45deg);
          }
          .mobile-menu {
            display: flex;
            flex-direction: column;
            gap: 0.4rem;
            grid-column: 1 / -1;
            padding-top: 0.75rem;
            margin-top: 0.75rem;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
          }
          .mobile-link {
            display: block;
            width: 100%;
            text-align: left;
            color: #fff;
            text-decoration: none;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 0.6rem;
            padding: 0.75rem 1rem;
            font-size: 0.88rem;
            font-weight: 600;
            cursor: pointer;
          }
          .mobile-link.active {
            background: linear-gradient(135deg, var(--primary, #4f5fff), color-mix(in srgb, var(--primary, #4f5fff) 100%, black 28%));
            border-color: transparent;
            color: #12121a;
          }
          .mobile-logout {
            color: #ff8080;
          }
        }
      `}</style>
    </header>
  );
}
