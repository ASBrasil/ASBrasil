import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateNumberPool } from "@/lib/raffle";
import { createParticipantSession } from "@/lib/participant-session";
import { put } from "@vercel/blob";
import { randomUUID } from "node:crypto";
import { ParticipantSource } from "@prisma/client";

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

interface SignupField {
  key: string;
  label: string;
  required: boolean;
  type?: "text" | "photo";
}

/**
 * Public self-signup for events with publicSignupEnabled - the person
 * isn't a known participant yet, so unlike the mission photo-upload route
 * this can't require a participant session. Everything (text fields +
 * photo file, if the event has a photo-type field) comes in one
 * multipart request instead of a separate upload-then-reference flow,
 * since there's no session yet to gate a standalone upload endpoint with.
 */
export async function POST(req: NextRequest) {
  const form = await req.formData();
  const slug = form.get("slug") as string | null;
  if (!slug) return NextResponse.json({ error: "Evento não informado" }, { status: 400 });

  const event = await db.event.findUnique({ where: { slug } });
  if (!event || !event.active || event.archived) {
    return NextResponse.json({ error: "Evento não encontrado" }, { status: 404 });
  }
  if (!event.publicSignupEnabled) {
    return NextResponse.json({ error: "Inscrição pública não está habilitada para este evento" }, { status: 403 });
  }

  const fields = (event.signupFields as unknown as SignupField[]) ?? [];

  const name = String(form.get("name") ?? "").trim();
  const emailRaw = String(form.get("email") ?? "").trim().toLowerCase();

  if (!name || !emailRaw) {
    return NextResponse.json({ error: "Nome e e-mail são obrigatórios" }, { status: 400 });
  }

  const custom: Record<string, string> = {};
  let photoUrl: string | null = null;

  for (const field of fields) {
    if (field.key === "name" || field.key === "email") continue;

    if (field.type === "photo") {
      const file = form.get(field.key) as File | null;
      if (field.required && (!file || file.size === 0)) {
        return NextResponse.json({ error: `Envie ${field.label.toLowerCase()}` }, { status: 400 });
      }
      if (file && file.size > 0) {
        if (!ALLOWED_TYPES.has(file.type)) {
          return NextResponse.json(
            { error: "Formato de imagem não suportado. Envie JPG, PNG, WEBP ou GIF." },
            { status: 400 }
          );
        }
        if (file.size > MAX_BYTES) {
          return NextResponse.json({ error: "Imagem muito grande. Máximo de 8MB." }, { status: 400 });
        }
        if (!process.env.BLOB_READ_WRITE_TOKEN) {
          return NextResponse.json(
            { error: "Upload de imagens não está configurado neste ambiente." },
            { status: 501 }
          );
        }
        const ext = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
        const blob = await put(`signup-photos/${randomUUID()}.${ext}`, file, {
          access: "public",
          addRandomSuffix: false,
        });
        photoUrl = blob.url;
      }
      continue;
    }

    // Campo de texto (phone, orderNumber, instagram, ou qualquer outro
    // custom key) - phone tem coluna própria no Participant, o resto vai
    // pro JSON livre.
    const value = String(form.get(field.key) ?? "").trim();
    if (field.required && !value) {
      return NextResponse.json({ error: `Preencha ${field.label.toLowerCase()}` }, { status: 400 });
    }
    if (value) custom[field.key] = value;
  }

  const existing = await db.participant.findFirst({
    where: { eventId: event.id, email: emailRaw },
  });
  if (existing) {
    await createParticipantSession(emailRaw);
    return NextResponse.json({
      alreadyRegistered: true,
      raffleNumber: existing.raffleNumber,
      pendingApproval: existing.moderationStatus === "PENDING",
    });
  }

  const [raffleNumber] = generateNumberPool(1);
  const phone = custom.phone ?? null;
  delete custom.phone;

  // Sempre que o evento pede foto obrigatória, a inscrição nasce Pendente
  // - independente do toggle "Exigir aprovação manual" estar ligado ou não.
  // Isso fecha a brecha de alguém marcar a foto como obrigatória mas
  // esquecer (ou não perceber) que precisava ligar o outro toggle também:
  // pedir comprovante e não revisar ele não faz sentido nenhum.
  const hasRequiredPhoto = fields.some((f) => f.type === "photo" && f.required);
  const needsApproval = event.requireSignupApproval || hasRequiredPhoto;

  const participant = await db.participant.create({
    data: {
      eventId: event.id,
      name,
      email: emailRaw,
      phone,
      raffleNumber,
      source: ParticipantSource.SIGNUP,
      photoUrl,
      customData: Object.keys(custom).length > 0 ? custom : undefined,
      moderationStatus: needsApproval ? "PENDING" : "APPROVED",
    },
  });

  await createParticipantSession(emailRaw);

  return NextResponse.json({
    raffleNumber: participant.raffleNumber,
    pendingApproval: needsApproval,
  });
}
