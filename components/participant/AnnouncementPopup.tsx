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
        <div style={{ textAlign: "center", background: "#f3f4f6" }}>
          <img
            src={popup.imageUrl}
            alt={popup.title ?? ""}
            style={{
              display: "inline-block",
              verticalAlign: "top",
              maxWidth: "100%",
              maxHeight: "78vh",
              width: "auto",
              height: "auto",
              objectFit: "contain",
            }}
          />
          {(popup.title || popup.body) && (
            <div className="image-caption">
              {popup.title && <h2>{popup.title}</h2>}
              {popup.body && <p>{popup.body}</p>}
            </div>
          )}
        </div>
      )}
      {popup.type === "HTML" && popup.body && (
        <div className="html-content" dangerouslySetInnerHTML={{ __html: popup.body }} />
      )}
    </>
  );

  return (
    <div className="overlay" onClick={close}>
      <div
        className="modal"
        style={popup.type === "IMAGE" ? { maxWidth: "min(92vw, 34rem)" } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
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
        .image-caption {
          padding: 1.5rem 1.5rem 1.75rem;
          text-align: center;
          background: linear-gradient(180deg, #171c3a, #0a0e1f);
        }
        .image-caption::before {
          content: "";
          display: block;
          width: 2.75rem;
          height: 3px;
          margin: 0 auto 1rem;
          border-radius: 999px;
          background: linear-gradient(90deg, #4f5fff, #a855f7, #ec4899);
        }
        .image-caption h2 {
          margin: 0 0 0.5rem;
          color: white;
          font-family: "Sora", system-ui, sans-serif;
          font-size: 1.3rem;
          line-height: 1.3;
        }
        .image-caption p {
          margin: 0;
          color: rgba(255, 255, 255, 0.68);
          font-size: 0.92rem;
          line-height: 1.6;
          white-space: pre-wrap;
        }
        .html-content {
          padding: 1.5rem;
        }
      `}</style>
    </div>
  );
}
