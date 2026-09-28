"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";

export function ImageUpload({
  label,
  hint,
  value,
  onChange,
  folder,
  aspectRatio = "16 / 9",
}: {
  label: string;
  hint?: string;
  value?: string | null;
  onChange: (url: string | null) => void;
  folder: string;
  /** CSS aspect-ratio for the preview box, e.g. "16 / 9" or "1 / 1". */
  aspectRatio?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  // Preview ampliada (pedido do Paulo: "algo a ampliar pra poder ver
  // melhor") - clicar na miniatura abre a imagem em tamanho grande, num
  // overlay renderizado via portal (mesma técnica usada no menu mobile do
  // participante, pra não ficar preso a nenhum ancestral com overflow/
  // backdrop-filter que corte o modal).
  const [lightboxOpen, setLightboxOpen] = useState(false);

  async function upload(file: File) {
    setUploading(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    form.append("folder", folder);
    try {
      const res = await fetch("/api/admin/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Não foi possível enviar a imagem.");
        return;
      }
      onChange(data.url);
    } catch {
      setError("Falha de conexão. Tente novamente.");
    } finally {
      setUploading(false);
    }
  }

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (file) upload(file);
  }

  return (
    <div className="field">
      <span className="label">{label}</span>

      {value ? (
        <div className="preview" style={{ aspectRatio }}>
          <img
            src={value}
            alt=""
            className="zoomable"
            onClick={() => setLightboxOpen(true)}
            title="Clique para ampliar"
          />
          <div className="preview-actions">
            <button type="button" onClick={() => setLightboxOpen(true)} disabled={uploading}>
              Ampliar
            </button>
            <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}>
              Trocar
            </button>
            <button type="button" className="remove" onClick={() => onChange(null)} disabled={uploading}>
              Remover
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className={`dropzone ${dragOver ? "drag" : ""}`}
          style={{ aspectRatio }}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            handleFiles(e.dataTransfer.files);
          }}
          disabled={uploading}
        >
          {uploading ? (
            <span>Enviando…</span>
          ) : (
            <>
              <span className="icon">🖼️</span>
              <span>Arraste uma imagem ou clique para escolher</span>
              <span className="filetypes">JPG, PNG ou WEBP · até 8MB</span>
            </>
          )}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        hidden
        onChange={(e) => handleFiles(e.target.files)}
      />

      {hint && !error && <span className="hint">{hint}</span>}
      {error && <span className="error">{error}</span>}

      {lightboxOpen &&
        value &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="lightbox" onClick={() => setLightboxOpen(false)}>
            <button
              type="button"
              className="lightbox-close"
              onClick={() => setLightboxOpen(false)}
              aria-label="Fechar"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M5 5l14 14M19 5 5 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            <img src={value} alt="" onClick={(e) => e.stopPropagation()} />
            <style jsx>{`
              .lightbox {
                position: fixed;
                inset: 0;
                z-index: 200;
                background: rgba(5, 8, 18, 0.85);
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 3rem 1.5rem;
                cursor: zoom-out;
              }
              .lightbox img {
                max-width: min(90vw, 60rem);
                max-height: 85vh;
                object-fit: contain;
                border-radius: 0.5rem;
                box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
                cursor: default;
              }
              .lightbox-close {
                position: fixed;
                top: 1.25rem;
                right: 1.5rem;
                width: 2.4rem;
                height: 2.4rem;
                border-radius: 999px;
                border: none;
                background: rgba(255, 255, 255, 0.12);
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: pointer;
              }
              .lightbox-close:hover {
                background: rgba(255, 255, 255, 0.22);
              }
            `}</style>
          </div>,
          document.body
        )}

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
        .dropzone {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          width: 100%;
          border: 1.5px dashed var(--border);
          border-radius: 0.75rem;
          background: var(--bg);
          color: var(--text-muted);
          font-size: 0.85rem;
          cursor: pointer;
          padding: 1rem;
          text-align: center;
        }
        .dropzone.drag,
        .dropzone:hover:not(:disabled) {
          border-color: var(--indigo-600);
          color: var(--text);
        }
        .dropzone:disabled {
          opacity: 0.6;
          cursor: default;
        }
        .icon {
          font-size: 1.6rem;
        }
        .filetypes {
          font-size: 0.75rem;
          opacity: 0.7;
        }
        .preview {
          position: relative;
          width: 100%;
          border-radius: 0.75rem;
          overflow: hidden;
          border: 1px solid var(--border);
        }
        .preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .preview img.zoomable {
          cursor: zoom-in;
        }
        .preview-actions {
          position: absolute;
          bottom: 0.6rem;
          right: 0.6rem;
          display: flex;
          gap: 0.4rem;
        }
        .preview-actions button {
          font-size: 0.75rem;
          font-weight: 600;
          padding: 0.35rem 0.7rem;
          border-radius: 999px;
          border: none;
          background: rgba(0, 0, 0, 0.65);
          color: white;
          cursor: pointer;
          backdrop-filter: blur(4px);
        }
        .preview-actions button:hover:not(:disabled) {
          background: rgba(0, 0, 0, 0.8);
        }
        .preview-actions .remove {
          background: rgba(192, 57, 43, 0.8);
        }
        .preview-actions .remove:hover:not(:disabled) {
          background: rgba(192, 57, 43, 0.95);
        }
        .hint {
          font-size: 0.78rem;
          color: var(--text-muted);
        }
        .error {
          font-size: 0.78rem;
          color: #c0392b;
        }
      `}</style>
    </div>
  );
}
