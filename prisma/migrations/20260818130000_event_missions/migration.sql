-- CreateEnum
CREATE TYPE "EventMissionMode" AS ENUM ('SIMPLE', 'MISSIONS');

-- CreateEnum
CREATE TYPE "MissionType" AS ENUM ('SELF_CHECK', 'QUIZ', 'PHOTO_UPLOAD', 'LINK_VISIT');

-- AlterTable
ALTER TABLE "Event" ADD COLUMN "missionMode" "EventMissionMode" NOT NULL DEFAULT 'SIMPLE';

-- CreateTable
CREATE TABLE "Mission" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "type" "MissionType" NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "linkUrl" TEXT,
    "quizOptions" JSONB,
    "quizCorrectIndex" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Mission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MissionCompletion" (
    "id" TEXT NOT NULL,
    "missionId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "photoUrl" TEXT,
    "quizAnswer" INTEGER,
    "quizCorrect" BOOLEAN,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MissionCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Mission_eventId_order_idx" ON "Mission"("eventId", "order");

-- CreateIndex
CREATE INDEX "MissionCompletion_missionId_idx" ON "MissionCompletion"("missionId");

-- CreateIndex
CREATE UNIQUE INDEX "MissionCompletion_missionId_email_key" ON "MissionCompletion"("missionId", "email");

-- AddForeignKey
ALTER TABLE "Mission" ADD CONSTRAINT "Mission_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MissionCompletion" ADD CONSTRAINT "MissionCompletion_missionId_fkey" FOREIGN KEY ("missionId") REFERENCES "Mission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
