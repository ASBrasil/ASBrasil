-- CreateTable
-- Progresso permanente do "AS City Run" (hub /universo-as/arcade) - mesmo
-- padrão de ArcadeProgress (migration 20260929120000), aditiva, sem risco
-- pros dados existentes.
CREATE TABLE "CityRunProgress" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "cleared" BOOLEAN NOT NULL DEFAULT false,
    "stars" INTEGER NOT NULL DEFAULT 0,
    "bestScore" INTEGER NOT NULL DEFAULT 0,
    "bestTimeMs" INTEGER,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CityRunProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CityRunProgress_email_route_key" ON "CityRunProgress"("email", "route");

-- CreateIndex
CREATE INDEX "CityRunProgress_route_idx" ON "CityRunProgress"("route");

-- AddForeignKey
ALTER TABLE "CityRunProgress" ADD CONSTRAINT "CityRunProgress_email_fkey" FOREIGN KEY ("email") REFERENCES "UniverseProfile"("email") ON DELETE CASCADE ON UPDATE CASCADE;
