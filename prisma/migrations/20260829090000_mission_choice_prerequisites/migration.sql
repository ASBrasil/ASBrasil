-- AlterTable
ALTER TABLE "Mission" ADD COLUMN "requiresApproval" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Participant" ADD COLUMN "awaitingPrerequisite" BOOLEAN NOT NULL DEFAULT false;
