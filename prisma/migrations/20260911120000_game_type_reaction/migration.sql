-- AlterEnum
-- Novo tipo de jogo "Purple Reaction" (mede tempo de reação em rodadas) -
-- só adiciona um valor ao enum existente, não mexe em nenhuma coluna/tabela,
-- então não tem risco pra dados já gravados.
ALTER TYPE "GameType" ADD VALUE 'REACTION';
