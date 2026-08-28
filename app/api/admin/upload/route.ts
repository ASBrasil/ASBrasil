import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { randomUUID } from "node:crypto";
import { requireAdmin } from "@/lib/auth";
import { compressImage } from "@/lib/image";

export const maxDuration = 30;

const MAX_BYTES = 8 * 1024 * 1024; // 8MB - generous for a banner/prize photo, small enough to stay well under Vercel's request body limit
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

/**
 * Generic image upload for admin-authored content (event banners, prize
 * photos). Not participant-facing and not linked from anywhere public
 * without an admin having pasted the resulting URL into an event/prize
 * first, so this doesn't need per-object access control beyond "is an
 * admin uploading it".
 */
export async function POST(req: NextRequest) {
  await requireAdmin();

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      {
        error:
          "Upload de imagens não está configurado neste ambiente. Crie um Blob Store no projeto Vercel (Storage → Create Database → Blob) para habilitar.",
      },
      { status: 501 }
    );
  }

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const folder = (form.get("folder") as string | null) ?? "uploads";

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

  const safeFolder = /^[a-z0-9-]+$/i.test(folder) ? folder : "uploads";
  // Compressão mais leve que a dos participantes (banner/design precisa de
  // mais qualidade e resolução que um comprovante de inscrição) - ainda
  // corta bastante o peso de fotos vindas direto da câmera sem edição.
  let compressed: Buffer, extension: string;
  try {
    const original = Buffer.from(await file.arrayBuffer());
    ({ buffer: compressed, extension } = await compressImage(original, { maxWidth: 2000, quality: 85 }));
  } catch {
    return NextResponse.json({ error: "Não foi possível processar essa imagem. Tente outro arquivo." }, { status: 400 });
  }
  const key = `${safeFolder}/${randomUUID()}.${extension}`;

  const blob = await put(key, compressed, {
    access: "public",
    addRandomSuffix: false,
    contentType: "image/jpeg",
  });

  return NextResponse.json({ url: blob.url });
}
