import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { importParticipants } from "@/lib/import";
import { parseCsvRows, parseXlsxRows, peekHeaders } from "@/lib/parsers";

/**
 * Two modes, both multipart/form-data with a `file` and `eventId`:
 *  - mode=peek   -> returns just the column headers, so the admin UI can
 *                   render the mapping form (Nome -> "Nome da coluna", ...)
 *  - mode=commit -> takes the confirmed `mapping` (JSON) and runs the full
 *                   streaming import described in lib/import.ts
 *
 * Splitting it this way means the (potentially large) file is only parsed
 * fully once the admin has confirmed the mapping, and the UI never has to
 * hold 10k rows in the browser to build that form.
 */
export async function POST(req: NextRequest) {
  await requireAdmin();

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const eventId = form.get("eventId") as string | null;
  const mode = (form.get("mode") as string | null) ?? "peek";

  if (!file || !eventId) {
    return NextResponse.json({ error: "file e eventId são obrigatórios" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const kind = file.name.toLowerCase().endsWith(".csv") ? "csv" : "xlsx";

  if (mode === "peek") {
    const headers = await peekHeaders(buffer, kind);
    return NextResponse.json({ headers });
  }

  const mappingRaw = form.get("mapping") as string | null;
  if (!mappingRaw) {
    return NextResponse.json({ error: "mapping é obrigatório em mode=commit" }, { status: 400 });
  }
  const mapping = JSON.parse(mappingRaw);
  const rows = kind === "csv" ? parseCsvRows(buffer) : parseXlsxRows(buffer);

  const result = await importParticipants({ eventId, filename: file.name, mapping, rows });
  return NextResponse.json({ result });
}
