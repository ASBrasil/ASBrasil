-- AlterEnum
-- Novo tipo de jogo "AS World Adventure" (plataforma - moedas, obstáculos,
-- pulo) - só adiciona um valor ao enum existente, não mexe em nenhuma
-- coluna/tabela, então não tem risco pra dados já gravados.
ALTER TYPE "GameType" ADD VALUE 'WORLD';
