// AS Brasil UI V4 (29/09) - primitives reutilizáveis do kit de design novo.
// Vindo do pacote externo "V4" que o Paulo mandou (ver claude/pendencias-sorteios.md
// pro histórico completo e a decisão de aplicar tela por tela com preview antes).
// Nenhum destes componentes tem lógica de negócio - são só casca visual em cima
// das classes globais `as-*` (app/globals.css). Usar dentro de um wrapper com a
// classe `as-shell` pra ganhar o fundo/tipografia escura do kit.
"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="as-page-head">
      <div>
        {eyebrow && <div className="as-eyebrow">{eyebrow}</div>}
        <h1 className="as-title">{title}</h1>
        {subtitle && <div className="as-subtitle">{subtitle}</div>}
      </div>
      {actions && <div>{actions}</div>}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`as-card ${className}`}>{children}</div>;
}

export function Button({
  children,
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "ghost" | "danger" }) {
  return (
    <button className={`as-btn as-btn-${variant} ${className}`} {...props}>
      {children}
    </button>
  );
}

export function Badge({ children, tone = "" }: { children: ReactNode; tone?: "success" | "warning" | "danger" | "" }) {
  return <span className={`as-badge ${tone ? `as-badge-${tone}` : ""}`}>{children}</span>;
}

export function KPI({ label, value, trend }: { label: string; value: ReactNode; trend?: string }) {
  return (
    <Card className="as-kpi">
      <div className="as-kpi-label">{label}</div>
      <div className="as-kpi-value">{value}</div>
      {trend && <div className="as-kpi-trend">{trend}</div>}
    </Card>
  );
}

export function EmptyState({
  icon = "✦",
  title,
  text,
  action,
}: {
  icon?: string;
  title: string;
  text: string;
  action?: ReactNode;
}) {
  return (
    <div className="as-empty">
      <div>
        <div className="as-empty-icon">{icon}</div>
        <h3>{title}</h3>
        <p>{text}</p>
        {action}
      </div>
    </div>
  );
}

export function Progress({ value }: { value: number }) {
  return (
    <div className="as-progress">
      <span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}
