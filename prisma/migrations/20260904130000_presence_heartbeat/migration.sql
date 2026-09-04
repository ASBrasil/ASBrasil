-- CreateTable
CREATE TABLE "Presence" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Presence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Presence_eventId_email_key" ON "Presence"("eventId", "email");

-- CreateIndex
CREATE INDEX "Presence_eventId_lastSeenAt_idx" ON "Presence"("eventId", "lastSeenAt");

-- AddForeignKey
ALTER TABLE "Presence" ADD CONSTRAINT "Presence_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
