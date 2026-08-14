-- AlterTable
ALTER TABLE "Event" ADD COLUMN "archived" BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX "Event_archived_idx" ON "Event"("archived");
