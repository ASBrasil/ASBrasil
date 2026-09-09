-- AlterTable
ALTER TABLE "Participant" ADD COLUMN "gamePhaseId" TEXT;

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_gamePhaseId_fkey" FOREIGN KEY ("gamePhaseId") REFERENCES "GamePhase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
