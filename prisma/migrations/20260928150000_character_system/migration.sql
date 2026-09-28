-- CreateTable
CREATE TABLE "Character" (
    "id" TEXT NOT NULL,
    "experienceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "rarity" TEXT NOT NULL DEFAULT 'comum',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerCharacter" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "obtainedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerCharacter_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "GamePhase" ADD COLUMN "rewardCharacterId" TEXT;

-- AlterTable
ALTER TABLE "UniverseProfile" ADD COLUMN "avatarCharacterId" TEXT;

-- CreateIndex
CREATE INDEX "Character_experienceId_idx" ON "Character"("experienceId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerCharacter_email_characterId_key" ON "PlayerCharacter"("email", "characterId");

-- CreateIndex
CREATE INDEX "PlayerCharacter_characterId_idx" ON "PlayerCharacter"("characterId");

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_experienceId_fkey" FOREIGN KEY ("experienceId") REFERENCES "Experience"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerCharacter" ADD CONSTRAINT "PlayerCharacter_email_fkey" FOREIGN KEY ("email") REFERENCES "UniverseProfile"("email") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerCharacter" ADD CONSTRAINT "PlayerCharacter_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GamePhase" ADD CONSTRAINT "GamePhase_rewardCharacterId_fkey" FOREIGN KEY ("rewardCharacterId") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UniverseProfile" ADD CONSTRAINT "UniverseProfile_avatarCharacterId_fkey" FOREIGN KEY ("avatarCharacterId") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;
