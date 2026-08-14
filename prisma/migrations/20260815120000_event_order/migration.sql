-- AlterTable
ALTER TABLE "Event" ADD COLUMN "order" INTEGER NOT NULL DEFAULT 0;

-- Backfill: give each event an initial order matching what the admin sees
-- today (newest first), scoped per archived group, so the first view after
-- this migration looks unchanged - only future moves change anything.
WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY archived ORDER BY "createdAt" DESC) - 1 AS rn
  FROM "Event"
)
UPDATE "Event" e
SET "order" = ranked.rn
FROM ranked
WHERE e.id = ranked.id;

-- CreateIndex
CREATE INDEX "Event_archived_order_idx" ON "Event"("archived", "order");
