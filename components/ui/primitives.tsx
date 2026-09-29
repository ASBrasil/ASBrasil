import { ButtonHTMLAttributes, InputHTMLAttributes, PropsWithChildren } from "react";

// Casca fina em cima do kit V4 (app/globals.css) pra reaproveitar em todo o
// admin sem precisar reescrever cada tela que já usa Button/Field/Input/Card -
// ver claude/pendencias-sorteios.md pelo histórico do redesign V4.
export function Button({
  children,
  variant = "primary",
  ...rest
}: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" }>) {
  const variantClass = variant === "ghost" ? "as-btn-ghost" : "as-btn-primary";
  return (
    <button {...rest} className={`as-btn ${variantClass}`}>
      {children}
    </button>
  );
}

export function Field({
  label,
  hint,
  required,
  children,
}: PropsWithChildren<{ label: string; hint?: string; required?: boolean }>) {
  return (
    <label className="field">
      <span className="as-label">
        {label}
        {required && <span className="req">*</span>}
      </span>
      {children}
      {hint && <span className="as-help">{hint}</span>}
      <style jsx>{`
        .field {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          margin-bottom: 1.1rem;
        }
        .req {
          color: var(--as-cyan, var(--indigo-600));
          margin-left: 0.15rem;
        }
      `}</style>
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className="as-input" />;
}

export function Card({ children, icon }: PropsWithChildren<{ icon?: string }>) {
  return (
    <div className="as-card card">
      {icon && <div className="icon">{icon}</div>}
      {children}
      <style jsx>{`
        .card {
          padding: 1.75rem;
        }
        .icon {
          width: 2.5rem;
          height: 2.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 0.75rem;
          background: color-mix(in srgb, var(--as-cyan, var(--indigo-600)) 12%, transparent);
          margin-bottom: 1rem;
          font-size: 1.2rem;
        }
      `}</style>
    </div>
  );
}
