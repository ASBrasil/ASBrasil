-- AlterTable
ALTER TABLE "Prize" ADD COLUMN "autoDraw" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "DrawResult" ADD COLUMN "drawnAutomatically" BOOLEAN NOT NULL DEFAULT false;
