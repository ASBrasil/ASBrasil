-- CreateTable
-- Visibilidade individual dos 4 jogos do hub /universo-as/arcade (Game
-- Universe). Sem linha pra um gameId = LIVE (comportamento de antes,
-- aberto pra todo mundo) - aditiva, sem risco pros dados existentes.
CREATE TABLE "ArcadeGameSetting" (
    "gameId" TEXT NOT NULL,
    "visibility" "GameVisibility" NOT NULL DEFAULT 'LIVE',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArcadeGameSetting_pkey" PRIMARY KEY ("gameId")
);
