"use client";

import { useState } from "react";

interface LosePopupContent {
  type: "TEXT" | "IMAGE" | "HTML";
  title: string | null;
  body: string | null;
  imageUrl: string | null;
  linkUrl: string | null;
}

/**
 * Same visual language as the global AnnouncementPopup, but scoped to one
 * prize's result reveal instead of the site-wide Meus Eventos banner.
 * Built with inline styles from the start - the global popup had a
 * persistent, never-fully-explained issue where its styled-jsx classes
 * silently failed to apply in production (twice), and inline styles were
 * the fix both times. Starting here the same way avoids repeating that.
 */
export function PrizeLosePopupOverlay({ popup }: { popup: LosePopupContent }) {
  const [open, setOpen] = useState(true);
  if (!open) return null;

  function close() {
    setOpen(false);
  }

  const content = (
    <>
      {popup.type === "TEXT" && (
        <div style={{ padding: "2.25rem 1.75rem 1.75rem", textAlign: "center" }}>
          {popup.title && (
            <h2
              style={{
                margin: "0 0 0.6rem",
                fontFamily: "Sora, system-ui, sans-serif",
                fontSize: "1.3rem",
                color: "#12121a",
              }}
            >
              {popup.title}
            </h2>
          )}
          {popup.body && (
            <p style={{ margin: 0, color: "#4b5563", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
              {popup.body}
            </p>
          )}
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
            <div
              style={{
                padding: "1.5rem 1.5rem 1.75rem",
                textAlign: "center",
                background: "linear-gradient(180deg, #171c3a, #0a0e1f)",
              }}
            >
              <span
                aria-hidden
                style={{
                  display: "block",
                  width: "2.75rem",
                  height: "3px",
                  margin: "0 auto 1rem",
                  borderRadius: "999px",
                  background: "linear-gradient(90deg, #4f5fff, #a855f7, #ec4899)",
                }}
              />
              {popup.title && (
                <h2
                  style={{
                    margin: "0 0 0.5rem",
                    color: "#ffffff",
                    fontFamily: "Sora, system-ui, sans-serif",
                    fontSize: "1.3rem",
                    lineHeight: 1.3,
                  }}
                >
                  {popup.title}
                </h2>
              )}
              {popup.body && (
                <p
                  style={{
                    margin: 0,
                    color: "rgba(255, 255, 255, 0.72)",
                    fontSize: "0.92rem",
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {popup.body}
                </p>
              )}
            </div>
          )}
        </div>
      )}
      {popup.type === "HTML" && popup.body && (
        <div style={{ padding: "1.5rem" }} dangerouslySetInnerHTML={{ __html: popup.body }} />
      )}
    </>
  );

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10, 15, 35, 0.65)",
        backdropFilter: "blur(3px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 200,
        padding: "1.5rem",
      }}
      onClick={close}
    >
      <div
        style={{
          position: "relative",
          background: "white",
          borderRadius: "1rem",
          maxWidth: popup.type === "IMAGE" ? "min(92vw, 34rem)" : "26rem",
          width: "100%",
          maxHeight: "85vh",
          overflow: "auto",
          boxShadow: "0 1.5rem 4rem rgba(0, 0, 0, 0.35)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={close}
          aria-label="Fechar"
          style={{
            position: "absolute",
            top: "0.6rem",
            right: "0.6rem",
            width: "2rem",
            height: "2rem",
            borderRadius: "50%",
            border: "none",
            background: "rgba(0, 0, 0, 0.55)",
            color: "white",
            fontSize: "0.9rem",
            cursor: "pointer",
            zIndex: 1,
          }}
        >
          ✕
        </button>
        {popup.linkUrl ? (
          <a
            href={popup.linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ display: "block", color: "inherit", textDecoration: "none" }}
          >
            {content}
          </a>
        ) : (
          content
        )}
      </div>
    </div>
  );
}
