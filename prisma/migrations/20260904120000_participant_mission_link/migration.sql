-- AlterTable
ALTER TABLE "Participant" ADD COLUMN "missionId" TEXT;

-- CreateIndex
CREATE INDEX "Participant_missionId_idx" ON "Participant"("missionId");

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE SET NULL ON UPDATE CASCADE;
