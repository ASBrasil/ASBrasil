import { ButtonHTMLAttributes, InputHTMLAttributes, PropsWithChildren } from "react";

export function Button({
  children,
  variant = "primary",
  ...rest
}: PropsWithChildren<ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" }>) {
  return (
    <button {...rest} className={`btn ${variant}`}>
      {children}
      <style jsx>{`
        .btn {
          padding: 0.7rem 1.4rem;
          border-radius: 999px;
          border: none;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
        }
        .btn:disabled {
          opacity: 0.55;
          cursor: default;
        }
        .primary {
          background: var(--indigo-600);
          color: white;
        }
        .primary:hover:not(:disabled) {
          background: var(--indigo-700);
        }
        .ghost {
          background: transparent;
          color: var(--text-muted);
        }
      `}</style>
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
      <span className="label">
        {label}
        {required && <span className="req">*</span>}
      </span>
      {children}
      {hint && <span className="hint">{hint}</span>}
      <style jsx>{`
        .field {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          margin-bottom: 1.1rem;
        }
        .label {
          font-size: 0.85rem;
          font-weight: 600;
        }
        .req {
          color: var(--indigo-600);
          margin-left: 0.15rem;
        }
        .hint {
          font-size: 0.78rem;
          color: var(--text-muted);
        }
      `}</style>
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <span className="input-wrap">
      <input {...props} className="input" />
      <style jsx>{`
        .input-wrap {
          display: contents;
        }
        .input {
          padding: 0.7rem 0.9rem;
          border-radius: 0.6rem;
          border: 1px solid var(--border);
          font-size: 0.95rem;
          background: var(--surface);
        }
        .input:focus {
          outline: 2px solid var(--indigo-600);
          outline-offset: 1px;
        }
      `}</style>
    </span>
  );
}

export function Card({ children, icon }: PropsWithChildren<{ icon?: string }>) {
  return (
    <div className="card">
      {icon && <div className="icon">{icon}</div>}
      {children}
      <style jsx>{`
        .card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 1rem;
          padding: 1.75rem;
        }
        .icon {
          width: 2.5rem;
          height: 2.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 0.75rem;
          background: color-mix(in srgb, var(--indigo-600) 12%, white);
          margin-bottom: 1rem;
          font-size: 1.2rem;
        }
      `}</style>
    </div>
  );
}
