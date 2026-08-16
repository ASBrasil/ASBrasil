"use client";

import { useEffect, useState } from "react";

interface PopupData {
  id: string;
  type: "TEXT" | "IMAGE" | "HTML";
  title: string | null;
  body: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
}

export function AnnouncementPopup({ popup }: { popup: PopupData | null }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // Aparece sempre que a pessoa entra na página, sem controle de "já vi
    // antes" - o admin decide quando desligar o aviso (desativando o
    // pop-up), não o navegador de cada participante.
    if (popup) setOpen(true);
  }, [popup]);

  if (!popup || !open) return null;

  function close() {
    setOpen(false);
  }

  const content = (
    <>
      {popup.type === "TEXT" && (
        <div className="text-content">
          {popup.title && <h2>{popup.title}</h2>}
          {popup.body && <p>{popup.body}</p>}
        </div>
      )}
      {popup.type === "IMAGE" && popup.imageUrl && (
        <div className="image-content">
          <img src={popup.imageUrl} alt={popup.title ?? ""} />
          {popup.title && <p className="image-caption">{popup.title}</p>}
        </div>
      )}
      {popup.type === "HTML" && popup.body && (
        <div className="html-content" dangerouslySetInnerHTML={{ __html: popup.body }} />
      )}
    </>
  );

  return (
    <div className="overlay" onClick={close}>
      <div className={`modal ${popup.type === "IMAGE" ? "image-modal" : ""}`} onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={close} aria-label="Fechar">
          ✕
        </button>
        {popup.linkUrl ? (
          <a href={popup.linkUrl} target="_blank" rel="noopener noreferrer" className="link-wrap">
            {content}
          </a>
        ) : (
          content
        )}
      </div>

      <style jsx>{`
        .overlay {
          position: fixed;
          inset: 0;
          background: rgba(10, 15, 35, 0.65);
          backdrop-filter: blur(3px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 200;
          padding: 1.5rem;
        }
        .modal {
          position: relative;
          background: white;
          border-radius: 1rem;
          max-width: 26rem;
          width: 100%;
          max-height: 85vh;
          overflow: auto;
          box-shadow: 0 1.5rem 4rem rgba(0, 0, 0, 0.35);
        }
        .modal.image-modal {
          max-width: min(92vw, 34rem);
        }
        .close {
          position: absolute;
          top: 0.6rem;
          right: 0.6rem;
          width: 2rem;
          height: 2rem;
          border-radius: 50%;
          border: none;
          background: rgba(0, 0, 0, 0.55);
          color: white;
          font-size: 0.9rem;
          cursor: pointer;
          z-index: 1;
        }
        .link-wrap {
          display: block;
          color: inherit;
          text-decoration: none;
        }
        .text-content {
          padding: 2.25rem 1.75rem 1.75rem;
          text-align: center;
        }
        .text-content h2 {
          margin: 0 0 0.6rem;
          font-family: "Sora", system-ui, sans-serif;
          font-size: 1.3rem;
        }
        .text-content p {
          margin: 0;
          color: #4b5563;
          line-height: 1.6;
          white-space: pre-wrap;
        }
        .image-content {
          text-align: center;
          background: #f3f4f6;
          line-height: 0; /* remove o espacinho fantasma que "inline" deixa embaixo da imagem */
        }
        .image-content img {
          display: inline-block;
          max-width: 100%;
          max-height: 78vh;
          object-fit: contain;
        }
        .image-caption {
          padding: 1rem 1.25rem;
          margin: 0;
          text-align: center;
          font-weight: 600;
          line-height: 1.4; /* .image-content zera o line-height pra colar a imagem; a legenda precisa do próprio de volta */
        }
        .html-content {
          padding: 1.5rem;
        }
      `}</style>
    </div>
  );
}
