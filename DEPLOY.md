# Publicar como um site único (GitHub + Vercel)

Isto é **um projeto só**. `/admin`, `/entrar`, `/e/[slug]` são rotas dentro da mesma
aplicação Next.js — mesmo banco, mesmo deploy, mesmo domínio no final. Não existe
"sistema do admin" e "sistema do participante" separados; é uma coisa publicada
de uma vez.

## 1. Subir pro GitHub

```bash
cd sorteios-app
git init
git add .
git commit -m "Sistema de sorteios AS Brasil"
```

Crie um repositório vazio no GitHub (botão "New repository", sem README/gitignore
pra não conflitar) e depois:

```bash
git remote add origin https://github.com/SEU-USUARIO/sorteios-as-brasil.git
git branch -M main
git push -u origin main
```

O `.gitignore` que já está no projeto impede que `.env`, `node_modules` e `.next`
subam junto — normal, cada ambiente (local, produção) tem suas próprias variáveis.

## 2. Banco de dados em produção

Se ainda não criou um Postgres pra valer (o Neon que usamos pra testar local já
serve), confirme só que está num plano/projeto que você pretende manter — não o
descartável.

## 3. Conectar no Vercel

1. Entre em https://vercel.com, "Add New Project", escolha o repositório que você
   acabou de subir.
2. O Vercel detecta que é Next.js automaticamente. Não precisa mudar build command
   nem output.
3. Em **Environment Variables**, adicione as mesmas do seu `.env` local:
   - `DATABASE_URL`
   - `AUTH_SECRET`
   - (`STORAGE_*` quando o upload de imagens existir)
4. Clique em **Deploy**.

Em ~1-2 minutos o Vercel te dá uma URL tipo `sorteios-as-brasil.vercel.app` — **esse
já é o site completo**: `/admin/login`, `/entrar`, `/e/bts-sorteio` etc. todos ali.

## 4. Rodar as migrações no banco de produção

As tabelas não se criam sozinhas. Antes do primeiro deploy funcionar de fato:

```bash
# localmente, apontando pra DATABASE_URL de produção
DATABASE_URL="sua-connection-string-de-producao" npx prisma migrate deploy
DATABASE_URL="sua-connection-string-de-producao" npm run seed
```

(o `migrate deploy`, diferente do `migrate dev` que usamos local, não pergunta nada
— só aplica as migrações que já existem no projeto)

## 5. Domínio próprio (opcional)

Em **Settings → Domains** no projeto do Vercel, dá pra apontar algo como
`sorteios.asbrasil.com` — só precisa criar um registro CNAME no seu provedor de DNS
apontando pro Vercel.

## Depois disso

Todo `git push` na branch `main` publica automaticamente uma nova versão do site
inteiro. Não tem passo manual de "atualizar o admin" e depois "atualizar o
participante" — é um deploy só.
