# Como rodar e testar localmente

## 1. Pré-requisitos

- **Node.js 20+** — https://nodejs.org
- **Um banco Postgres**. Caminho mais rápido pra testar sem instalar nada localmente:
  crie um banco grátis em https://neon.tech (leva ~1 minuto, já sai com a
  `DATABASE_URL` pronta pra copiar). Se preferir local, `brew install postgresql` ou
  Docker (`docker run -e POSTGRES_PASSWORD=postgres -p 5432:5432 postgres`).

## 2. Instalar

```bash
unzip sistema-sorteios.zip
cd sorteios-app
npm install
```

## 3. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Edite o `.env`:

- `DATABASE_URL` → cole a connection string do Neon (ou a do seu Postgres local)
- `AUTH_SECRET` → gere com `openssl rand -base64 32` e cole o resultado

As variáveis de `STORAGE_*` (S3) podem ficar vazias por enquanto — upload de imagens
ainda não está implementado.

## 4. Criar as tabelas e o usuário admin

```bash
npx prisma migrate dev --name init
npm run seed
```

O seed cria um admin de teste:

- **e-mail:** `admin@asbrasil.com`
- **senha:** `trocar123`

(dá pra sobrescrever antes de rodar o seed, exportando `SEED_ADMIN_EMAIL` e
`SEED_ADMIN_PASSWORD`)

## 5. Rodar

```bash
npm run dev
```

Abra:

- **Painel admin:** http://localhost:3000/admin/login
- Depois de logar, crie um evento em `/admin/events/new` e siga o wizard.
- **Página pública** de um evento: http://localhost:3000/e/seu-slug

## 6. Testando o fluxo completo

1. Faça login em `/admin/login`.
2. Crie um evento (wizard de 5 passos). No passo "Participantes", monte uma planilha
   de teste (CSV com colunas `Nome` e `E-mail`, algumas linhas) e importe.
3. No passo "Prêmios", cadastre um ou dois prêmios.
4. Publique o evento.
5. No dashboard do evento, clique em **"Sortear agora"** — deve rodar a animação do
   bombo e revelar o vencedor. Em seguida, clique em **"Publicar resultado"** pra
   ele aparecer na página de vencedores.
6. Confira a página pública (`/e/seu-slug`) — o botão "Acompanhar meus sorteios"
   leva pro fluxo novo do participante.
7. Abra `/entrar` numa aba anônima (evita misturar com a sessão de admin, já que
   são cookies diferentes mas é mais limpo testar separado) e digite um dos
   e-mails que você importou. Deve cair em `/meus-eventos`.
8. Clique no evento → cai no painel pessoal (`/e/[slug]/painel`), com o número da
   pessoa e o caminho dos sorteios no topo. Clique num prêmio: se já foi sorteado,
   mostra o resultado (ganhou ou não); se não, mostra a contagem regressiva até a
   data marcada.
9. Em `/admin/events/[id]/participants`, teste a busca e a exportação CSV.

## Problemas comuns

- **Erro do Prisma sobre "provider"**: o schema está configurado pra Postgres. Se
  quiser testar sem Postgres, troque `provider = "postgresql"` para
  `provider = "sqlite"` em `prisma/schema.prisma` e use `DATABASE_URL="file:./dev.db"`
  — mais rápido pra um teste local, mas troque de volta antes de ir pra produção.
- **"AUTH_SECRET must be set"**: esqueceu de preencher o `.env`.
- **Import não aparece**: confira se o CSV tem cabeçalho (primeira linha com os nomes
  das colunas) — é isso que a etapa de mapeamento lê.
- **`/entrar` diz que não encontrou o e-mail**: confira se o evento está com
  `active = true` (só publica no passo "Publicar" do wizard) — a busca só considera
  eventos ativos.
