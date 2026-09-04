-- CreateTable
CREATE TABLE "ParticipantNotice" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readAt" TIMESTAMP(3),

    CONSTRAINT "ParticipantNotice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ParticipantNotice_eventId_email_readAt_idx" ON "ParticipantNotice"("eventId", "email", "readAt");

-- AddForeignKey
ALTER TABLE "ParticipantNotice" ADD CONSTRAINT "ParticipantNotice_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
