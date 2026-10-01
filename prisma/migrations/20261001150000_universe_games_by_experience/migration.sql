-- Universo AS passa a ser por EXPERIÊNCIA, não por evento individual
-- (pedido do Paulo em 01/10 - uma experiência pode agrupar vários sorteios,
-- e todos compartilham o mesmo arcade). As tabelas UniverseGame/
-- UniverseCharacter ainda estão sem nenhum dado real em produção, então é
-- uma troca direta de coluna/FK, sem necessidade de preservar linhas.

-- DropForeignKey
ALTER TABLE "UniverseGame" DROP CONSTRAINT "UniverseGame_eventId_fkey";
ALTER TABLE "UniverseCharacter" DROP CONSTRAINT "UniverseCharacter_eventId_fkey";

-- DropIndex
DROP INDEX "UniverseGame_eventId_idx";
DROP INDEX "UniverseCharacter_eventId_idx";

-- RenameColumn
ALTER TABLE "UniverseGame" RENAME COLUMN "eventId" TO "experienceId";
ALTER TABLE "UniverseCharacter" RENAME COLUMN "eventId" TO "experienceId";

-- CreateIndex
CREATE INDEX "UniverseGame_experienceId_idx" ON "UniverseGame"("experienceId");
CREATE INDEX "UniverseCharacter_experienceId_idx" ON "UniverseCharacter"("experienceId");

-- AddForeignKey
ALTER TABLE "UniverseGame" ADD CONSTRAINT "UniverseGame_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "Experience"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UniverseCharacter" ADD CONSTRAINT "UniverseCharacter_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "Experience"("id") ON DELETE CASCADE ON UPDATE CASCADE;
