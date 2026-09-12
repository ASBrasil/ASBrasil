-- AlterEnum
-- Novo tipo de jogo "Ticket Rush" (itens caindo, toca só nos válidos) - só
-- adiciona um valor ao enum existente, não mexe em nenhuma coluna/tabela,
-- então não tem risco pra dados já gravados.
ALTER TYPE "GameType" ADD VALUE 'TICKET';
