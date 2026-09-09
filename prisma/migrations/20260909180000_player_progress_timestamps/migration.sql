-- AlterTable
ALTER TABLE "PlayerPhaseProgress" ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "PlayerPhaseProgress" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "PlayerPhaseProgress_createdAt_idx" ON "PlayerPhaseProgress"("createdAt");