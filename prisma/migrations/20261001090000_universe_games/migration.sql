-- Catálogo do hub "Universo AS" (/e/[slug]/arcade) por evento - 2 tabelas
-- novas e aditivas, nenhuma tabela existente é alterada. GameType e
-- GameVisibility já existem (reaproveitados aqui).

-- CreateTable
CREATE TABLE "UniverseGame" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "engine" "GameType" NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "tag" TEXT NOT NULL DEFAULT '',
    "coverImageUrl" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "visibility" "GameVisibility" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UniverseGame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UniverseCharacter" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "imageUrl" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UniverseCharacter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UniverseGame_slug_key" ON "UniverseGame"("slug");

-- CreateIndex
CREATE INDEX "UniverseGame_eventId_idx" ON "UniverseGame"("eventId");

-- CreateIndex
CREATE INDEX "UniverseCharacter_eventId_idx" ON "UniverseCharacter"("eventId");

-- AddForeignKey
ALTER TABLE "UniverseGame" ADD CONSTRAINT "UniverseGame_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UniverseCharacter" ADD CONSTRAINT "UniverseCharacter_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
