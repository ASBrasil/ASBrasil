-- AlterEnum
ALTER TYPE "ParticipantSource" ADD VALUE 'GAME';

-- CreateEnum
CREATE TYPE "GameType" AS ENUM ('QUIZ', 'MEMORY', 'RHYTHM', 'HUNT', 'CARDS');

-- CreateEnum
CREATE TYPE "GameVisibility" AS ENUM ('DRAFT', 'TESTING', 'LIVE');

-- CreateTable
CREATE TABLE "UniverseProfile" (
    "email" TEXT NOT NULL,
    "displayName" TEXT,
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UniverseProfile_pkey" PRIMARY KEY ("email")
);

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "GameType" NOT NULL,
    "theme" JSONB NOT NULL DEFAULT '{}',
    "visibility" "GameVisibility" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GamePhase" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "type" "GameType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 10,
    "rewardCardId" TEXT,
    "grantsExtraTicket" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "GamePhase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameCard" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rarity" TEXT NOT NULL DEFAULT 'comum',
    "imageUrl" TEXT,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerCard" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "obtainedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerPhaseProgress" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phaseId" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "firstScore" INTEGER NOT NULL DEFAULT 0,
    "attempts" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PlayerPhaseProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameTester" (
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GameTester_pkey" PRIMARY KEY ("email")
);

-- CreateIndex
CREATE UNIQUE INDEX "Game_slug_key" ON "Game"("slug");

-- CreateIndex
CREATE INDEX "Game_eventId_idx" ON "Game"("eventId");

-- CreateIndex
CREATE INDEX "GamePhase_gameId_order_idx" ON "GamePhase"("gameId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerCard_email_cardId_key" ON "PlayerCard"("email", "cardId");

-- CreateIndex
CREATE INDEX "PlayerCard_cardId_idx" ON "PlayerCard"("cardId");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerPhaseProgress_email_phaseId_key" ON "PlayerPhaseProgress"("email", "phaseId");

-- CreateIndex
CREATE INDEX "PlayerPhaseProgress_phaseId_idx" ON "PlayerPhaseProgress"("phaseId");

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GamePhase" ADD CONSTRAINT "GamePhase_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GamePhase" ADD CONSTRAINT "GamePhase_rewardCardId_fkey" FOREIGN KEY ("rewardCardId") REFERENCES "GameCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerCard" ADD CONSTRAINT "PlayerCard_email_fkey" FOREIGN KEY ("email") REFERENCES "UniverseProfile"("email") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerCard" ADD CONSTRAINT "PlayerCard_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "GameCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerPhaseProgress" ADD CONSTRAINT "PlayerPhaseProgress_email_fkey" FOREIGN KEY ("email") REFERENCES "UniverseProfile"("email") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerPhaseProgress" ADD CONSTRAINT "PlayerPhaseProgress_phaseId_fkey" FOREIGN KEY ("phaseId") REFERENCES "GamePhase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
