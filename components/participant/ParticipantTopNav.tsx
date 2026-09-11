"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

type MobileTile = {
  key: string;
  href: string;
  label: string;
  description: string;
  icon: string;
  accent: "primary" | "violet" | "amber" | "pink" | "cyan" | "emerald";
  external?: boolean;
};

// Menu mobile em formato de "cartões com ícone" (referência: menu rápido do
// app.asbrasil.tur.br) - agrupa TUDO num único menu (em vez de separar link
// de navegação de "ação em destaque" como na versão anterior), cada item com
// ícone colorido + título + descrição curta, pra ficar mais fácil de escanear
// visualmente do que uma lista de texto puro.
const MOBILE_TILES: MobileTile[] = [
  {
    key: "home",
    href: "/meus-eventos",
    label: "Início",
    description: "Seus sorteios e eventos em andamento",
    icon: "🏠",
    accent: "primary",
  },
  {
    key: "universo",
    href: "/universo-as",
    label: "Universo AS",
    description: "Jogos, missões e o álbum de figurinhas",
    icon: "🎮",
    accent: "violet",
  },
  {
    key: "conquistas",
    href: "/conquistas",
    label: "Conquistas",
    description: "Suas figurinhas e prêmios desbloqueados",
    icon: "🏆",
    accent: "amber",
  },
  {
    key: "vencedores",
    href: "/vencedores",
    label: "Vencedores",
    description: "Quem já foi sorteado nos eventos",
    icon: "🎉",
    accent: "pink",
  },
  {
    key: "perfil",
    href: "/perfil",
    label: "Meu perfil",
    description: "Seus dados, apelido e fotos",
    icon: "👤",
    accent: "cyan",
  },
  {
    key: "reservas",
    href: "https://app.asbrasil.tur.br/",
    label: "Minhas reservas",
    description: "Histórico no app de reservas ↗",
    icon: "🎫",
    accent: "emerald",
    external: true,
  },
];

/**
 * Topo compartilhado de todas as páginas do participante. `eventName` é
 * opcional - páginas "gerais" (home, Universo AS, Conquistas) não têm um
 * evento único como contexto, só páginas de um sorteio específico (/e/[slug])
 * passam isso.
 *
 * Em tela estreita, em vez do menu rolar de lado (o que não ficava claro que
 * dava pra rolar), ele recolhe tudo atrás de um botão de menu com um tom
 * diferente pra chamar atenção. O menu mobile em si (o "sheet" que sobe de
 * baixo) reaproveita o padrão visual do app de reservas (app.asbrasil.tur.br)
 * que o Paulo mandou de referência: cartão com ícone circular colorido +
 * título + descrição por item, todos agrupados num só menu, com botão de
 * fechar e "Sair da conta" em destaque no rodapé.
 */
export function ParticipantTopNav({ eventName }: { eventName?: string }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuClosing, setMenuClosing] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fecha com uma pequena animação de saída (mesmo padrão da referência) em
  // vez de sumir seco - só desmonta o sheet depois da transição da folha.
  const closeMenu = useCallback(() => {
    setMenuClosing(true);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    closeTimerRef.current = setTimeout(() => {
      setMenuOpen(false);
      setMenuClosing(false);
      closeTimerRef.current = null;
    }, 220);
  }, []);

  // Fecha o menu sozinho quando a pessoa navega pra outra página - sem isso
  // ele ficaria aberto por cima do conteúdo da página seguinte.
  useEffect(() => {
    setMenuOpen(false);
    setMenuClosing(false);
  }, [pathname]);

  // Trava o scroll da página por trás enquanto o menu (sheet) está aberto -
  // senão dava pra rolar o conteúdo de fundo por baixo do overlay.
  useEffect(() => {
    if (!menuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [menuOpen]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    };
  }, []);

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
          onClick={() => (menuOpen ? closeMenu() : setMenuOpen(true))}
        >
          <span className="bar" />
          <span className="bar" />
          <span className="bar" />
        </button>
      </div>

      {menuOpen && (
        <div className={`mobile-sheet ${menuClosing ? "closing" : ""}`}>
          <div className="mobile-sheet__overlay" onClick={closeMenu} />

          <div className="mobile-sheet__panel">
            <div className="mobile-sheet__handle" aria-hidden />

            <div className="mobile-sheet__top">
              <div className="mobile-sheet__brand">
                <span className="mobile-sheet__logo" aria-hidden>
                  ●
                </span>
                <div>
                  <p className="mobile-sheet__eyebrow">Menu</p>
                  <p className="mobile-sheet__title">Navegação</p>
                </div>
              </div>
              <button
                type="button"
                className="mobile-sheet__close"
                onClick={closeMenu}
                aria-label="Fechar menu"
              >
                ✕
              </button>
            </div>

            {/* Todas as opções agrupadas num único menu de cartões - cada
                item com ícone colorido, título e descrição curta, igual ao
                "menu rápido" do app de reservas usado de referência. */}
            <nav className="mobile-sheet__tiles">
              {MOBILE_TILES.map((tile) => {
                const active =
                  !tile.external &&
                  (pathname === tile.href || pathname?.startsWith(tile.href + "/"));
                const inner = (
                  <>
                    <span className={`mobile-tile__icon mobile-tile__icon--${tile.accent}`} aria-hidden>
                      {tile.icon}
                    </span>
                    <span className="mobile-tile__content">
                      <strong>{tile.label}</strong>
                      <small>{tile.description}</small>
                    </span>
                    <span className="mobile-tile__chevron" aria-hidden>
                      ›
                    </span>
                  </>
                );

                if (tile.external) {
                  return (
                    <a
                      key={tile.key}
                      href={tile.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mobile-tile"
                    >
                      {inner}
                    </a>
                  );
                }

                return (
                  <Link
                    key={tile.key}
                    href={tile.href}
                    className={`mobile-tile ${active ? "active" : ""}`}
                    onClick={closeMenu}
                  >
                    {inner}
                  </Link>
                );
              })}
            </nav>

            <form action="/api/public/session" method="post">
              <button className="mobile-sheet__cta">Sair da conta</button>
            </form>
          </div>
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

        /* ------------------------------------------------------------------
         * Menu mobile ("sheet" que sobe de baixo, com overlay escurecendo o
         * fundo) - independente da media query abaixo porque só é montado
         * via JS quando "menuOpen" é true (o botão que abre já só aparece em
         * tela estreita), então não precisa de mais uma trava por CSS.
         * ------------------------------------------------------------------ */
        .mobile-sheet {
          position: fixed;
          inset: 0;
          z-index: 100;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding: 0 0.75rem;
        }
        .mobile-sheet__overlay {
          position: absolute;
          inset: 0;
          background: rgba(4, 6, 20, 0.72);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          animation: sheet-overlay-in 180ms ease-out;
        }
        .mobile-sheet.closing .mobile-sheet__overlay {
          animation: sheet-overlay-out 220ms ease-in forwards;
        }
        .mobile-sheet__panel {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 30rem;
          max-height: calc(100vh - 2rem);
          overflow-y: auto;
          margin-bottom: calc(env(safe-area-inset-bottom, 0px) + 0.5rem);
          border-radius: 1.5rem 1.5rem 1.15rem 1.15rem;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: linear-gradient(180deg, rgba(14, 16, 38, 0.98), rgba(8, 10, 26, 0.98));
          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.06);
          animation: sheet-panel-in 300ms cubic-bezier(0.16, 1, 0.3, 1);
        }
        .mobile-sheet.closing .mobile-sheet__panel {
          animation: sheet-panel-out 220ms cubic-bezier(0.4, 0, 1, 1) forwards;
        }
        .mobile-sheet__handle {
          width: 2.4rem;
          height: 0.25rem;
          margin: 0.5rem auto 0;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.18);
        }
        .mobile-sheet__top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 0.75rem;
          padding: 0.85rem 1rem 0.5rem;
        }
        .mobile-sheet__brand {
          display: flex;
          align-items: center;
          gap: 0.6rem;
        }
        .mobile-sheet__logo {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 2.1rem;
          height: 2.1rem;
          flex-shrink: 0;
          border-radius: 0.85rem;
          background: rgba(255, 255, 255, 0.06);
          color: var(--primary, #4f5fff);
          font-size: 1.1rem;
        }
        .mobile-sheet__eyebrow {
          margin: 0;
          font-size: 0.62rem;
          font-weight: 800;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: color-mix(in srgb, var(--primary, #4f5fff) 70%, white 20%);
        }
        .mobile-sheet__title {
          margin: 0.15rem 0 0;
          font-size: 1rem;
          font-weight: 800;
          color: #fff;
        }
        .mobile-sheet__close {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 2.1rem;
          height: 2.1rem;
          flex-shrink: 0;
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.06);
          color: #fff;
          cursor: pointer;
          font-size: 0.85rem;
        }
        .mobile-sheet__tiles {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
          padding: 0.25rem 0.85rem 0.6rem;
        }
        .mobile-tile {
          display: grid;
          grid-template-columns: auto minmax(0, 1fr) auto;
          align-items: center;
          gap: 0.7rem;
          width: 100%;
          text-align: left;
          text-decoration: none;
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 1.1rem;
          padding: 0.7rem;
          background: rgba(255, 255, 255, 0.03);
          transition: border-color 0.15s, background 0.15s, transform 0.15s;
        }
        .mobile-tile:active {
          transform: scale(0.99);
        }
        .mobile-tile.active {
          border-color: color-mix(in srgb, var(--primary, #4f5fff) 45%, transparent);
          background: color-mix(in srgb, var(--primary, #4f5fff) 12%, transparent);
        }
        .mobile-tile__icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 2.5rem;
          height: 2.5rem;
          flex-shrink: 0;
          border-radius: 0.9rem;
          font-size: 1.15rem;
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.14);
        }
        .mobile-tile__icon--primary {
          background: linear-gradient(
            135deg,
            var(--primary, #4f5fff),
            color-mix(in srgb, var(--primary, #4f5fff) 100%, black 28%)
          );
        }
        .mobile-tile__icon--violet {
          background: linear-gradient(135deg, #7c3aed, #a78bfa);
        }
        .mobile-tile__icon--amber {
          background: linear-gradient(135deg, #b45309, #fbbf24);
        }
        .mobile-tile__icon--pink {
          background: linear-gradient(135deg, #db2777, #f472b6);
        }
        .mobile-tile__icon--cyan {
          background: linear-gradient(135deg, #0891b2, #22d3ee);
        }
        .mobile-tile__icon--emerald {
          background: linear-gradient(135deg, #047857, #34d399);
        }
        .mobile-tile__content {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 0.15rem;
        }
        .mobile-tile__content strong {
          font-size: 0.86rem;
          font-weight: 800;
        }
        .mobile-tile__content small {
          font-size: 0.72rem;
          font-weight: 500;
          color: rgba(255, 255, 255, 0.6);
          line-height: 1.3;
        }
        .mobile-tile__chevron {
          opacity: 0.4;
          font-size: 1.1rem;
          flex-shrink: 0;
        }
        .mobile-tile.active .mobile-tile__chevron {
          opacity: 1;
          color: var(--primary, #4f5fff);
        }
        .mobile-sheet__cta {
          display: block;
          width: calc(100% - 1.7rem);
          margin: 0.35rem 0.85rem 0.9rem;
          padding: 0.8rem;
          border: 1px solid rgba(255, 128, 128, 0.3);
          border-radius: 0.9rem;
          background: linear-gradient(135deg, #dc2626, #b91c1c);
          color: #fff;
          font-size: 0.88rem;
          font-weight: 800;
          cursor: pointer;
        }

        @keyframes sheet-overlay-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes sheet-overlay-out {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }
        @keyframes sheet-panel-in {
          from {
            opacity: 0;
            transform: translateY(100%);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes sheet-panel-out {
          from {
            opacity: 1;
            transform: translateY(0);
          }
          to {
            opacity: 0;
            transform: translateY(100%);
          }
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
        }
      `}</style>
    </header>
  );
}
