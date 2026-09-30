-- CreateTable
-- Progresso permanente do "AS Neon Maze" (hub /universo-as/arcade) - mesmo
-- padrão de CityRunProgress (migration 20260929140000), aditiva, sem risco
-- pros dados existentes.
CREATE TABLE "NeonMazeProgress" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "world" TEXT NOT NULL,
    "cleared" BOOLEAN NOT NULL DEFAULT false,
    "stars" INTEGER NOT NULL DEFAULT 0,
    "bestScore" INTEGER NOT NULL DEFAULT 0,
    "bestTimeMs" INTEGER,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NeonMazeProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "NeonMazeProgress_email_world_key" ON "NeonMazeProgress"("email", "world");

-- CreateIndex
CREATE INDEX "NeonMazeProgress_world_idx" ON "NeonMazeProgress"("world");

-- AddForeignKey
ALTER TABLE "NeonMazeProgress" ADD CONSTRAINT "NeonMazeProgress_email_fkey" FOREIGN KEY ("email") REFERENCES "UniverseProfile"("email") ON DELETE CASCADE ON UPDATE CASCADE;
