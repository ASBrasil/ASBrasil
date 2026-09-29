-- CreateTable
-- Progresso permanente do "AS World Adventure" (hub /universo-as/arcade) -
-- não depende de sorteio/GamePhase, só aditiva, sem risco pros dados
-- existentes.
CREATE TABLE "ArcadeProgress" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "cleared" BOOLEAN NOT NULL DEFAULT false,
    "stars" INTEGER NOT NULL DEFAULT 0,
    "bestScore" INTEGER NOT NULL DEFAULT 0,
    "bestTimeMs" INTEGER,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArcadeProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ArcadeProgress_email_city_key" ON "ArcadeProgress"("email", "city");

-- CreateIndex
CREATE INDEX "ArcadeProgress_city_idx" ON "ArcadeProgress"("city");

-- AddForeignKey
ALTER TABLE "ArcadeProgress" ADD CONSTRAINT "ArcadeProgress_email_fkey" FOREIGN KEY ("email") REFERENCES "UniverseProfile"("email") ON DELETE CASCADE ON UPDATE CASCADE;
