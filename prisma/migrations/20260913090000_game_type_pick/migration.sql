-- AlterEnum
-- Novo tipo de jogo "Perfect Pick" (toca quando o marcador passa pelo
-- centro da barra) - só adiciona um valor ao enum existente, não mexe em
-- nenhuma coluna/tabela, então não tem risco pra dados já gravados.
ALTER TYPE "GameType" ADD VALUE 'PICK';
