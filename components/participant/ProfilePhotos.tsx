"use client";

import { useRef, useState } from "react";

interface PhotoSlotProps {
  label: string;
  hint: string;
  folder: "profile-avatars" | "profile-winner-photos";
  field: "avatarUrl" | "winnerPhotoUrl";
  initialUrl: string | null;
  shape: "round" | "square";
}

function PhotoSlot({ label, hint, folder, field, initialUrl, shape }: PhotoSlotProps) {
  const [url, setUrl] = useState(initialUrl);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("folder", folder);
      const uploadRes = await fetch("/api/public/upload", { method: "POST", body: form });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) {
        setError(uploadData.error ?? "Não foi possível enviar a foto.");
        setUploading(false);
        return;
      }
      const saveRes = await fetch("/api/public/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: uploadData.url }),
      });
      if (!saveRes.ok) {
        const saveData = await saveRes.json().catch(() => ({}));
        setError(saveData.error ?? "Foto enviada, mas não deu pra salvar no perfil.");
        setUploading(false);
        return;
      }
      setUrl(uploadData.url);
    } catch {
      setError("Não foi possível enviar a foto.");
    }
    setUploading(false);
  }

  return (
    <div className="slot">
      <div className={`preview ${shape}`}>
        {url ? <img src={url} alt={label} /> : <span className="placeholder">📷</span>}
        {uploading && <div className="overlay">Enviando…</div>}
      </div>
      <div className="slot-info">
        <p className="slot-label">{label}</p>
        <p className="slot-hint">{hint}</p>
        <button type="button" onClick={() => inputRef.current?.click()} disabled={uploading}>
          {url ? "Trocar foto" : "Adicionar foto"}
        </button>
        {error && <p className="error">{error}</p>}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />

      <style jsx>{`
        .slot {
          display: flex;
          align-items: center;
          gap: 1rem;
        }
        .preview {
          position: relative;
          width: 4.5rem;
          height: 4.5rem;
          flex-shrink: 0;
          overflow: hidden;
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .preview.round {
          border-radius: 50%;
        }
        .preview.square {
          border-radius: 0.6rem;
        }
        .preview img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .placeholder {
          font-size: 1.4rem;
          opacity: 0.5;
        }
        .overlay {
          position: absolute;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.65rem;
          text-align: center;
        }
        .slot-info {
          display: flex;
          flex-direction: column;
          gap: 0.3rem;
        }
        .slot-label {
          margin: 0;
          font-weight: 700;
          font-size: 0.88rem;
        }
        .slot-hint {
          margin: 0;
          font-size: 0.75rem;
          color: rgba(255, 255, 255, 0.55);
        }
        button {
          align-self: flex-start;
          margin-top: 0.2rem;
          background: none;
          border: 1px solid rgba(255, 255, 255, 0.3);
          color: #fff;
          border-radius: 999px;
          padding: 0.35rem 0.9rem;
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
        }
        button:disabled {
          opacity: 0.6;
          cursor: default;
        }
        .error {
          margin: 0.2rem 0 0;
          font-size: 0.75rem;
          color: #fca5a5;
        }
      `}</style>
    </div>
  );
}

export function ProfilePhotos({
  initialAvatarUrl,
  initialWinnerPhotoUrl,
}: {
  initialAvatarUrl: string | null;
  initialWinnerPhotoUrl: string | null;
}) {
  return (
    <div className="photos">
      <PhotoSlot
        label="Foto de perfil"
        hint="Aparece no ranking e no álbum do Universo AS"
        folder="profile-avatars"
        field="avatarUrl"
        initialUrl={initialAvatarUrl}
        shape="round"
      />
      <PhotoSlot
        label="Foto da vitória"
        hint="Usada se você for sorteado, pra anunciar o resultado"
        folder="profile-winner-photos"
        field="winnerPhotoUrl"
        initialUrl={initialWinnerPhotoUrl}
        shape="square"
      />

      <style jsx>{`
        .photos {
          display: flex;
          flex-direction: column;
          gap: 1.25rem;
          margin-bottom: 1.5rem;
        }
      `}</style>
    </div>
  );
}
