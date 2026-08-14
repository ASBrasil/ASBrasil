-- Allow the same e-mail to own multiple Participant rows in the same event
-- (one buyer purchasing several tickets for different people). Each row
-- keeps its own raffleNumber, so more tickets -> more draw entries.
DROP INDEX "Participant_eventId_email_key";

-- Superseded by the composite index below (which still serves plain
-- eventId-only lookups as a prefix match).
DROP INDEX "Participant_eventId_idx";

-- AlterTable
ALTER TABLE "Participant" ADD COLUMN "ticketCode" TEXT;

-- CreateIndex
-- Safe to add even with existing rows: every existing row's ticketCode is
-- NULL, and Postgres treats each NULL as distinct in a unique index.
CREATE UNIQUE INDEX "Participant_eventId_ticketCode_key" ON "Participant"("eventId", "ticketCode");

-- CreateIndex
CREATE INDEX "Participant_eventId_email_idx" ON "Participant"("eventId", "email");
