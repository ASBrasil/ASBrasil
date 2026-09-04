"use client";

import { useEffect, useState } from "react";

/**
 * Recado pontual que o admin manda pra uma pessoa específica (ex: "você
 * ainda não completou tal missão"), disparado no painel de "Pendências de
 * pré-requisito" do dashboard do evento. Aparece como pop-up na primeira
 * vez que essa pessoa abrir o painel depois do envio - não existe e-mail/
 * push, então isso só funciona quando ela volta a acessar o site.
 */
export function MissionNoticePopup({ eventId }: { eventId: string }) {
  const [notice, setNotice] = useState<{ id: string; message: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/public/notices?eventId=${eventId}`)
      .then((res) => (res.ok ? res.json() : { notice: null }))
      .then((data) => {
        if (!cancelled) setNotice(data.notice ?? null);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  function close() {
    if (!notice) return;
    fetch(`/api/public/notices/${notice.id}/read`, { method: "POST" }).catch(() => {});
    setNotice(null);
  }

  if (!notice) return null;

  return (
    <div className="overlay" onClick={close}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="close" onClick={close} aria-label="Fechar">
          ✕
        </button>
        <span className="icon">🔔</span>
        <h2>Um recado pra você</h2>
        <p>{notice.message}</p>
        <button type="button" className="cta" onClick={close}>
          Entendi
        </button>
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
          z-index: 250;
          padding: 1.5rem;
        }
        .modal {
          position: relative;
          background: white;
          color: #12121a;
          border-radius: 1rem;
          max-width: 24rem;
          width: 100%;
          padding: 2.25rem 1.75rem 1.75rem;
          text-align: center;
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
          background: rgba(0, 0, 0, 0.08);
          color: #12121a;
          font-size: 0.9rem;
          cursor: pointer;
        }
        .icon {
          display: block;
          font-size: 2.25rem;
          margin-bottom: 0.6rem;
        }
        h2 {
          margin: 0 0 0.6rem;
          font-family: "Sora", system-ui, sans-serif;
          font-size: 1.2rem;
        }
        p {
          margin: 0 0 1.5rem;
          color: #4b5563;
          line-height: 1.6;
          white-space: pre-wrap;
        }
        .cta {
          background: #4f5fff;
          color: white;
          border: none;
          border-radius: 999px;
          padding: 0.65rem 1.6rem;
          font-weight: 700;
          font-size: 0.9rem;
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
