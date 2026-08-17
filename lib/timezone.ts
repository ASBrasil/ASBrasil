/**
 * The server (Vercel) runs in UTC, not America/Sao_Paulo - so a naive
 * `new Date(now.getFullYear(), now.getMonth(), now.getDate())` computes
 * "midnight UTC", not "midnight in Brasília". Depending on the hour, that
 * puts the day boundary up to 3 hours off from what an admin in Brazil
 * would expect (e.g. "entradas hoje" resetting at 21:00 the day before).
 *
 * Brasília has been fixed at UTC-3 with no daylight saving since Brazil
 * abolished DST in 2019, so "00:00 in São Paulo" is always "03:00 UTC" on
 * the same calendar day - this just needs to know which calendar day it
 * currently is *in that timezone*, then anchor to 03:00 UTC.
 */
export function startOfTodayBrasilia(): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((p) => p.type === "year")!.value;
  const month = parts.find((p) => p.type === "month")!.value;
  const day = parts.find((p) => p.type === "day")!.value;

  return new Date(`${year}-${month}-${day}T03:00:00.000Z`);
}

/**
 * The exact same UTC-vs-Brasília mismatch, but for a much more consequential
 * spot: the date/time an admin types into a <input type="datetime-local">
 * when scheduling a draw. That input gives back a plain string with no
 * timezone info (e.g. "2026-08-20T15:00") - the admin means 15:00 in
 * Brasília, but `new Date("2026-08-20T15:00")` running on the server
 * (Vercel, UTC) parses it as 15:00 UTC, which is 12:00 in Brasília. The
 * draw would actually fire 3 hours earlier than the admin intended.
 *
 * Appending Brasília's fixed UTC-3 offset before parsing makes the
 * resulting Date correct regardless of what timezone the server itself
 * runs in.
 */
export function parseBrasiliaDatetimeLocal(value: string): Date {
  const withSeconds = value.length === 16 ? `${value}:00` : value; // "...T15:00" -> "...T15:00:00"
  return new Date(`${withSeconds}-03:00`);
}
