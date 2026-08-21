-- AlterEnum
ALTER TYPE "ParticipantSource" ADD VALUE 'MISSION';

-- AlterTable
ALTER TABLE "Mission" ADD COLUMN "unlockAt" TIMESTAMP(3);
ALTER TABLE "Mission" ADD COLUMN "grantsExtraTicket" BOOLEAN NOT NULL DEFAULT false;
