-- Loja de Personagens do Universo AS - aditiva, nenhuma tabela existente
-- perde dado. Adiciona desbloqueio pago (spriteId/pointsCost/isStarter em
-- Character, source em PlayerCharacter) e a moeda própria da loja
-- (CoinEntry, separada do XP/Ranking).

-- AlterTable
ALTER TABLE "Character" ADD COLUMN     "spriteId" TEXT,
ADD COLUMN     "pointsCost" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "isStarter" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "PlayerCharacter" ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'reward';

-- CreateTable
CREATE TABLE "CoinEntry" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CoinEntry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CoinEntry_email_idx" ON "CoinEntry"("email");

-- AddForeignKey
ALTER TABLE "CoinEntry" ADD CONSTRAINT "CoinEntry_email_fkey" FOREIGN KEY ("email") REFERENCES "UniverseProfile"("email") ON DELETE CASCADE ON UPDATE CASCADE;
