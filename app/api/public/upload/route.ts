import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { randomUUID } from "node:crypto";
import { getParticipantEmail } from "@/lib/participant-session";
import { compressImage } from "@/lib/image";

export const maxDuration = 30;

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

/**
 * Participant-facing counterpart to /api/admin/upload - same underlying
 * Blob storage, but gated by a valid participant session (not admin), and
 * restricted to a fixed folder so a logged-in participant can't write
 * arbitrary paths. Used for mission photo submissions.
 */
export async function POST(req: NextRequest) {
  const email = await getParticipantEmail();
  if (!email) {
    return NextResponse.json({ error: "Sessão expirada. Entre novamente." }, { status: 401 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "Upload de imagens não está configurado neste ambiente." },
      { status: 501 }
    );
  }

  const form = await req.formData();
  const file = form.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: "Formato não suportado. Envie JPG, PNG, WEBP ou GIF." },
      { status: 400 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Arquivo muito grande. Máximo de 8MB." }, { status: 400 });
  }

  let compressed: Buffer, extension: string;
  try {
    const original = Buffer.from(await file.arrayBuffer());
    ({ buffer: compressed, extension } = await compressImage(original));
  } catch {
    return NextResponse.json({ error: "Não foi possível processar essa imagem. Tente outro arquivo." }, { status: 400 });
  }
  const key = `mission-photos/${randomUUID()}.${extension}`;

  const blob = await put(key, compressed, { access: "public", addRandomSuffix: false, contentType: "image/jpeg" });

  return NextResponse.json({ url: blob.url });
}
