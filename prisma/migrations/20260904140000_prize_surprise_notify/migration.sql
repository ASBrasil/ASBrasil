-- AlterTable
ALTER TABLE "Prize" ADD COLUMN "surprise" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Prize" ADD COLUMN "unlockAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PrizeNotifyRequest" (
    "id" TEXT NOT NULL,
    "prizeId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrizeNotifyRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PrizeNotifyRequest_prizeId_email_key" ON "PrizeNotifyRequest"("prizeId", "email");

-- AddForeignKey
ALTER TABLE "PrizeNotifyRequest" ADD CONSTRAINT "PrizeNotifyRequest_prizeId_fkey" FOREIGN KEY ("prizeId") REFERENCES "Prize"("id") ON DELETE CASCADE ON UPDATE CASCADE;
