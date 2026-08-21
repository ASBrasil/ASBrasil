-- CreateEnum
CREATE TYPE "ParticipantModerationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN "requireSignupApproval" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Participant" ADD COLUMN "moderationStatus" "ParticipantModerationStatus" NOT NULL DEFAULT 'APPROVED';
