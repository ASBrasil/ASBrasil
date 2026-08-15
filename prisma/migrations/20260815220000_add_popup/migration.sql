-- CreateEnum
CREATE TYPE "PopupType" AS ENUM ('TEXT', 'IMAGE', 'HTML');

-- CreateTable
CREATE TABLE "Popup" (
    "id" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "type" "PopupType" NOT NULL DEFAULT 'TEXT',
    "title" TEXT,
    "body" TEXT,
    "imageUrl" TEXT,
    "linkUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Popup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Popup_active_idx" ON "Popup"("active");
