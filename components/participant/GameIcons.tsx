"use client";

import { useId } from "react";

// Ícones SVG originais e genéricos usados no lugar de emoji nos jogos do
// Universo AS (14/09). Nenhum reproduz marca/logo/personagem de nenhum
// artista - são formas simples (estrela, ônibus, microfone, etc.) que
// funcionam pra qualquer Game.theme, porque herdam a cor via `currentColor`
// em vez de ter uma cor fixa. Trocar aqui atualiza todo lugar que usa.

type IconProps = { size?: number; className?: string };

export function IconStar({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2.4l2.7 6.1 6.6.6-5 4.4 1.5 6.5L12 16.6l-5.8 3.4 1.5-6.5-5-4.4 6.6-.6L12 2.4z" />
    </svg>
  );
}

export function IconFlame({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2c1 3-2.5 4.2-2.5 7.4A3.3 3.3 0 0012.8 12.7 4.6 4.6 0 0017 8.1c2.3 2 3 4.7 3 6.6a8 8 0 01-16 0c0-3.9 2.6-5.7 4-8 .5 1.4 1.4 2 1.4 2C8.6 5.9 10.7 3.6 12 2z" />
    </svg>
  );
}

export function IconHeart({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 20.5s-7.6-4.5-10-9A5.3 5.3 0 0112 6.8 5.3 5.3 0 0122 11.5c-2.4 4.5-10 9-10 9z" />
    </svg>
  );
}

export function IconClock({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="12" cy="12.5" r="8.5" />
      <path d="M12 7.5v5.3l3.6 2.1" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function IconLightning({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M13 2L4 14h6l-1 8 9-13h-6z" />
    </svg>
  );
}

export function IconSparkle({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 2c.6 4 2.4 5.8 6.4 6.4-4 .6-5.8 2.4-6.4 6.4-.6-4-2.4-5.8-6.4-6.4C9.6 7.8 11.4 6 12 2z" />
      <path d="M19 15c.3 1.8 1 2.5 2.8 2.8-1.8.3-2.5 1-2.8 2.8-.3-1.8-1-2.5-2.8-2.8 1.8-.3 2.5-1 2.8-2.8z" />
    </svg>
  );
}

export function IconShare({ size = 18, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className={className}
    >
      <circle cx="18" cy="5" r="2.6" fill="currentColor" stroke="none" />
      <circle cx="6" cy="12" r="2.6" fill="currentColor" stroke="none" />
      <circle cx="18" cy="19" r="2.6" fill="currentColor" stroke="none" />
      <line x1="8.2" y1="10.8" x2="15.8" y2="6.2" />
      <line x1="8.2" y1="13.2" x2="15.8" y2="17.8" />
    </svg>
  );
}

export function IconCardBack({ size = 40, className }: IconProps) {
  return (
    <svg width={size} height={size * 1.35} viewBox="0 0 24 32" className={className}>
      <rect x="1" y="1" width="22" height="30" rx="3" fill="currentColor" opacity="0.9" />
      <rect x="4" y="4" width="16" height="24" rx="2" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="1" />
      <path
        d="M12 10.5l1.8 3.7 4 .5-2.9 2.8.8 4-3.7-2-3.7 2 .8-4-2.9-2.8 4-.5z"
        fill="rgba(255,255,255,0.7)"
      />
    </svg>
  );
}

// --- Tickets (Ticket Rush + AS Run + AS Memory) -----------------------------
// Recorte real via <mask>, então funciona sobre qualquer fundo (canvas
// escuro, card translúcido, etc.) sem precisar "adivinhar" a cor de trás.
export function IconTicket({ size = 18, className }: IconProps) {
  const maskId = useId();
  return (
    <svg width={size} height={(size * 16) / 24} viewBox="0 0 24 16" className={className}>
      <mask id={maskId}>
        <rect width="24" height="16" rx="3" fill="#fff" />
        <circle cx="16" cy="0" r="2.4" fill="#000" />
        <circle cx="16" cy="16" r="2.4" fill="#000" />
      </mask>
      <rect width="24" height="16" rx="3" fill="currentColor" mask={`url(#${maskId})`} />
      <line
        x1="16"
        y1="3.6"
        x2="16"
        y2="12.4"
        stroke="rgba(0,0,0,0.3)"
        strokeDasharray="1.6 1.6"
        strokeWidth="1"
      />
    </svg>
  );
}

export function IconTicketBan({ size = 18, className }: IconProps) {
  const maskId = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      <mask id={maskId}>
        <rect x="0" y="4" width="24" height="16" rx="3" fill="#fff" />
        <circle cx="16" cy="4" r="2.4" fill="#000" />
        <circle cx="16" cy="20" r="2.4" fill="#000" />
      </mask>
      <rect x="0" y="4" width="24" height="16" rx="3" fill="currentColor" opacity="0.55" mask={`url(#${maskId})`} />
      <circle cx="12" cy="12" r="10.4" fill="none" stroke="#ef4444" strokeWidth="2.2" />
      <line x1="4.6" y1="19.4" x2="19.4" y2="4.6" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

// Cone de obstáculo (item "ruim" do AS Run) - genérico, sem nenhuma marca.
export function IconCone({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      <rect x="3" y="19" width="18" height="3" rx="1" fill="currentColor" opacity="0.85" />
      <path d="M12 3l5.2 14.5H6.8z" fill="#f97316" />
      <path d="M8.5 13.2h7l1 3H7.5z" fill="#fff" />
      <path d="M9.8 9.5h4.4l1 3H8.8z" fill="#fff" opacity="0.95" />
    </svg>
  );
}

// --- Símbolos genéricos pro jogo da memória (até 18 pares) ------------------
export function IconBus({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}>
      <rect x="2.5" y="5" width="19" height="11" rx="2.5" fill="currentColor" />
      <rect x="5" y="7.2" width="4.2" height="3.4" rx="0.6" fill="#0a0e20" opacity="0.5" />
      <rect x="10.2" y="7.2" width="4.2" height="3.4" rx="0.6" fill="#0a0e20" opacity="0.5" />
      <rect x="15.4" y="7.2" width="4" height="3.4" rx="0.6" fill="#0a0e20" opacity="0.5" />
      <circle cx="7" cy="17.3" r="2" fill="#0a0e20" />
      <circle cx="17" cy="17.3" r="2" fill="#0a0e20" />
    </svg>
  );
}

export function IconMic({ size = 18, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className={className}
    >
      <rect x="9" y="2.5" width="6" height="11" rx="3" fill="currentColor" stroke="none" />
      <path d="M5.5 11.5a6.5 6.5 0 0013 0" />
      <line x1="12" y1="18" x2="12" y2="21.5" />
      <line x1="8.5" y1="21.5" x2="15.5" y2="21.5" />
    </svg>
  );
}

export function IconNote({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <circle cx="6.5" cy="18" r="3" />
      <circle cx="16.5" cy="16" r="3" />
      <path d="M9.3 18V5.5L19.3 3v11" stroke="currentColor" strokeWidth="2" fill="none" />
    </svg>
  );
}

export function IconTrophy({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M7 3h10v4a5 5 0 01-10 0V3z" />
      <path d="M7 4.2H3.5A3.5 3.5 0 007 7.6V5.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M17 4.2h3.5A3.5 3.5 0 0117 7.6V5.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <rect x="10.5" y="11" width="3" height="4" />
      <path d="M7.5 19.5h9l-1-2h-7z" />
      <rect x="6" y="19.5" width="12" height="2" rx="1" />
    </svg>
  );
}

export function IconGift({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <rect x="4" y="10" width="16" height="10" rx="1.2" />
      <rect x="3" y="7" width="18" height="4" rx="1" />
      <rect x="11" y="7" width="2" height="13" fill="#0a0e20" opacity="0.4" />
      <path d="M12 7c-1-3-6-3-6-.3C6 8 9 7 12 7z" />
      <path d="M12 7c1-3 6-3 6-.3C18 8 15 7 12 7z" />
    </svg>
  );
}

export function IconHeadphones({ size = 18, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className={className}
    >
      <path d="M4 14v-2a8 8 0 0116 0v2" />
      <rect x="2.5" y="13" width="4" height="6" rx="1.5" fill="currentColor" stroke="none" />
      <rect x="17.5" y="13" width="4" height="6" rx="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconBalloon({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <ellipse cx="12" cy="9" rx="6.5" ry="7.5" />
      <path d="M12 16.3l-1.3 2 1.3 1 1.3-1z" />
      <path d="M12 19.3v3" stroke="currentColor" strokeWidth="1.4" fill="none" />
    </svg>
  );
}

export function IconTarget({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconCamera({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <rect x="2.5" y="7" width="15" height="12" rx="2" />
      <path d="M17.5 10.5l4-2.5v9l-4-2.5z" />
      <circle cx="10" cy="13" r="3.2" fill="#0a0e20" opacity="0.55" />
    </svg>
  );
}

export function IconFlag({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <rect x="5" y="3" width="2" height="18" rx="1" />
      <path d="M7 4h12l-3 4 3 4H7z" />
    </svg>
  );
}

export function IconSuitcase({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className}>
      <rect x="3" y="8" width="18" height="12" rx="2" />
      <rect x="9" y="4.5" width="6" height="4" rx="1.2" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <rect x="10.7" y="12.5" width="2.6" height="3" fill="#0a0e20" opacity="0.5" />
    </svg>
  );
}

export function IconCompass({ size = 18, className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className={className}>
      <circle cx="12" cy="12" r="9.2" />
      <path d="M15.5 8.5l-2.3 5.3-5.3 2.3 2.3-5.3z" fill="currentColor" stroke="none" />
    </svg>
  );
}

// Ordem usada pelo jogo da memória - 18 símbolos distintos, cobre até 18
// pares (ver MEMORY_SYMBOLS em GamePlayer.tsx).
export const MEMORY_ICONS = [
  IconTicket,
  IconBus,
  IconStar,
  IconMic,
  IconHeart,
  IconSparkle,
  IconFlame,
  IconNote,
  IconTrophy,
  IconGift,
  IconHeadphones,
  IconBalloon,
  IconTarget,
  IconCamera,
  IconFlag,
  IconSuitcase,
  IconCompass,
  IconLightning,
];
