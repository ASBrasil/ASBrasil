-- CreateTable
CREATE TABLE "PrizeLosePopup" (
    "id" TEXT NOT NULL,
    "prizeId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "type" "PopupType" NOT NULL DEFAULT 'TEXT',
    "title" TEXT,
    "body" TEXT,
    "imageUrl" TEXT,
    "linkUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrizeLosePopup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PrizeLosePopup_prizeId_key" ON "PrizeLosePopup"("prizeId");

-- AddForeignKey
ALTER TABLE "PrizeLosePopup" ADD CONSTRAINT "PrizeLosePopup_prizeId_fkey" FOREIGN KEY ("prizeId") REFERENCES "Prize"("id") ON DELETE CASCADE ON UPDATE CASCADE;
