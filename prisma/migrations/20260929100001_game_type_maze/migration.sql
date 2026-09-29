-- AlterEnum
-- Novo tipo de jogo "AS Neon Maze" (labirinto - coleta e perseguição) - só
-- adiciona um valor ao enum existente, não mexe em nenhuma coluna/tabela,
-- então não tem risco pra dados já gravados.
ALTER TYPE "GameType" ADD VALUE 'MAZE';
