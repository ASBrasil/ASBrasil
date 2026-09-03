-- AlterTable
ALTER TABLE "LoginEvent" ADD COLUMN "eventId" TEXT;
ALTER TABLE "LoginEvent" ADD COLUMN "eventName" TEXT;

-- CreateIndex
CREATE INDEX "LoginEvent_eventId_createdAt_idx" ON "LoginEvent"("eventId", "createdAt");
