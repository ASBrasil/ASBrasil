-- AS Social (arcade): amigos, convites e salas - 4 tabelas novas e aditivas,
-- mesmo motivo de sempre (sandbox sem acesso aos binários do Prisma pra
-- rodar `prisma migrate dev`/`generate` de verdade). Nenhuma tabela
-- existente é alterada.

-- CreateEnum
CREATE TYPE "ArcadeFriendshipStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- CreateEnum
CREATE TYPE "ArcadeRoomStatus" AS ENUM ('WAITING', 'PLAYING', 'FINISHED');

-- CreateEnum
CREATE TYPE "ArcadeInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- CreateTable
CREATE TABLE "ArcadeFriendship" (
    "id" TEXT NOT NULL,
    "requesterEmail" TEXT NOT NULL,
    "addresseeEmail" TEXT NOT NULL,
    "status" "ArcadeFriendshipStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArcadeFriendship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArcadeRoom" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "hostEmail" TEXT NOT NULL,
    "status" "ArcadeRoomStatus" NOT NULL DEFAULT 'WAITING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArcadeRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArcadeRoomPlayer" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "ready" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArcadeRoomPlayer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArcadeInvite" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "fromEmail" TEXT NOT NULL,
    "toEmail" TEXT NOT NULL,
    "status" "ArcadeInviteStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArcadeInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ArcadeFriendship_requesterEmail_addresseeEmail_key" ON "ArcadeFriendship"("requesterEmail", "addresseeEmail");

-- CreateIndex
CREATE INDEX "ArcadeFriendship_addresseeEmail_status_idx" ON "ArcadeFriendship"("addresseeEmail", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ArcadeRoom_code_key" ON "ArcadeRoom"("code");

-- CreateIndex
CREATE INDEX "ArcadeRoom_hostEmail_idx" ON "ArcadeRoom"("hostEmail");

-- CreateIndex
CREATE UNIQUE INDEX "ArcadeRoomPlayer_roomId_email_key" ON "ArcadeRoomPlayer"("roomId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "ArcadeInvite_roomId_toEmail_key" ON "ArcadeInvite"("roomId", "toEmail");

-- CreateIndex
CREATE INDEX "ArcadeInvite_toEmail_status_idx" ON "ArcadeInvite"("toEmail", "status");

-- AddForeignKey
ALTER TABLE "ArcadeFriendship" ADD CONSTRAINT "ArcadeFriendship_requesterEmail_fkey" FOREIGN KEY ("requesterEmail") REFERENCES "UniverseProfile"("email") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArcadeFriendship" ADD CONSTRAINT "ArcadeFriendship_addresseeEmail_fkey" FOREIGN KEY ("addresseeEmail") REFERENCES "UniverseProfile"("email") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArcadeRoom" ADD CONSTRAINT "ArcadeRoom_hostEmail_fkey" FOREIGN KEY ("hostEmail") REFERENCES "UniverseProfile"("email") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArcadeRoomPlayer" ADD CONSTRAINT "ArcadeRoomPlayer_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "ArcadeRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArcadeRoomPlayer" ADD CONSTRAINT "ArcadeRoomPlayer_email_fkey" FOREIGN KEY ("email") REFERENCES "UniverseProfile"("email") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArcadeInvite" ADD CONSTRAINT "ArcadeInvite_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "ArcadeRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArcadeInvite" ADD CONSTRAINT "ArcadeInvite_fromEmail_fkey" FOREIGN KEY ("fromEmail") REFERENCES "UniverseProfile"("email") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArcadeInvite" ADD CONSTRAINT "ArcadeInvite_toEmail_fkey" FOREIGN KEY ("toEmail") REFERENCES "UniverseProfile"("email") ON DELETE CASCADE ON UPDATE CASCADE;
