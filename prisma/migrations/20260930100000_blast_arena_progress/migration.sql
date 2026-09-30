-- CreateTable
-- Progresso permanente do "AS Blast Arena" (hub /universo-as/arcade) - mesmo
-- padrão de CityRunProgress/NeonMazeProgress, aditiva, sem risco pros dados
-- existentes.
CREATE TABLE "BlastArenaProgress" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "arena" TEXT NOT NULL,
    "cleared" BOOLEAN NOT NULL DEFAULT false,
    "stars" INTEGER NOT NULL DEFAULT 0,
    "bestScore" INTEGER NOT NULL DEFAULT 0,
    "bestTimeMs" INTEGER,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BlastArenaProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BlastArenaProgress_email_arena_key" ON "BlastArenaProgress"("email", "arena");

-- CreateIndex
CREATE INDEX "BlastArenaProgress_arena_idx" ON "BlastArenaProgress"("arena");

-- AddForeignKey
ALTER TABLE "BlastArenaProgress" ADD CONSTRAINT "BlastArenaProgress_email_fkey" FOREIGN KEY ("email") REFERENCES "UniverseProfile"("email") ON DELETE CASCADE ON UPDATE CASCADE;
