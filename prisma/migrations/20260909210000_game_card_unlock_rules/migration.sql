-- AlterTable
ALTER TABLE "GameCard" ADD COLUMN "unlockEventId" TEXT;
ALTER TABLE "GameCard" ADD COLUMN "unlockGameId" TEXT;

-- CreateIndex
CREATE INDEX "GameCard_unlockEventId_idx" ON "GameCard"("unlockEventId");
CREATE INDEX "GameCard_unlockGameId_idx" ON "GameCard"("unlockGameId");

-- AddForeignKey
ALTER TABLE "GameCard" ADD CONSTRAINT "GameCard_unlockEventId_fkey" FOREIGN KEY ("unlockEventId") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GameCard" ADD CONSTRAINT "GameCard_unlockGameId_fkey" FOREIGN KEY ("unlockGameId") REFERENCES "Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;