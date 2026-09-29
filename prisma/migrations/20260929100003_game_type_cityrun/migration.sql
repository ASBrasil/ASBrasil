-- AlterEnum
-- Novo tipo de jogo "AS City Run" (corredor de 3 faixas - deliberadamente
-- separado de RUN mesmo sendo parecido, ver comentário no schema) - só
-- adiciona um valor ao enum existente, não mexe em nenhuma coluna/tabela,
-- então não tem risco pra dados já gravados.
ALTER TYPE "GameType" ADD VALUE 'CITYRUN';
