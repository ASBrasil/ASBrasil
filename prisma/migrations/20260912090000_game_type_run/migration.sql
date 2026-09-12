-- AlterEnum
-- Novo tipo de jogo "AS Run" (corredor de 3 faixas) - só adiciona um valor
-- ao enum existente, não mexe em nenhuma coluna/tabela, então não tem risco
-- pra dados já gravados.
ALTER TYPE "GameType" ADD VALUE 'RUN';
