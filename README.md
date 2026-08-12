# Sistema de Sorteios — arquitetura e estado do projeto

## 1. Arquitetura escolhida

| Camada | Escolha | Por quê |
|---|---|---|
| Frontend + backend | **Next.js 14 (App Router)**, TypeScript | Um único deploy serve o painel admin, as páginas públicas e a API. Server Components evitam mandar 10k participantes pro navegador só pra montar uma tela. |
| Banco de dados | **PostgreSQL** via Prisma | Precisa de transações reais (um sorteio é tudo-ou-nada), índices únicos (número de sorteio, e-mail por evento) e volume confortável de dezenas de milhares de linhas. SQLite serve só pra dev local. |
| Autenticação admin | Sessão em cookie **httpOnly**, JWT assinado (`jose`), verificada tanto na API quanto no `middleware.ts` (defesa em profundidade) | Simples de operar sem depender de um provedor externo; fácil trocar por NextAuth/Clerk se o time crescer. |
| Armazenamento de imagens | Objeto S3-compatível (S3, R2, Spaces) | Banners, logos, imagens de prêmio e fotos de vencedores não devem morar no banco nem no filesystem do servidor. |
| Importação XLSX/CSV | Leitura **em streaming** (`exceljs` streaming reader / `csv-parse`), validação em uma passada, inserção em lotes de 1000 via `createMany` | Evita carregar a planilha inteira na memória e evita 10.000 round-trips ao banco. |
| Números de sorteio | Pool pré-embaralhado com RNG criptográfico (`crypto.randomInt`), atribuído em lote | Sem loop de "tenta de novo se colidir" — cada número já sai único. |
| Sorteio | RNG criptográfico + seed auditável (HMAC-SHA256) gravado junto do resultado | Qualquer pessoa pode reprocessar o mesmo seed contra a mesma lista de elegíveis e confirmar que o vencedor é o mesmo — o sorteio é verificável, não uma caixa preta. |
| Auditoria | `DrawResult` é **append-only**: refazer um sorteio grava um novo registro e marca o anterior como `voided`, nunca apaga | Ninguém consegue "silenciosamente" trocar um vencedor. |

## 2. O que está implementado neste pacote

Isto é uma implementação de referência real (não só protótipo visual), cobrindo a espinha dorsal do sistema:

- **`prisma/schema.prisma`** — modelo de dados completo: Event, Participant, Prize, DrawResult, ImportBatch, AdminUser, com os índices e constraints únicos que garantem número único por evento e e-mail único por evento.
- **`lib/raffle.ts`** — geração do pool de números únicos e o mecanismo de sorteio auditável.
- **`lib/import.ts` + `lib/parsers.ts`** — pipeline de importação em streaming com mapeamento de colunas, deduplicação (dentro do arquivo e contra o banco) e inserção em lotes. Testado mentalmente contra o requisito de 10.000+ linhas.
- **`lib/auth.ts` + `middleware.ts`** — autenticação admin com sessão em cookie e proteção de rotas em duas camadas.
- **API routes**: criar evento, importar participantes (peek de cabeçalhos + commit com mapeamento), consulta pública de número (com rate limiting), executar sorteio de um prêmio.
- **`app/e/[slug]/page.tsx`** — página pública do evento: hero, prêmios em formato de "ticket" perfurado, formulário de consulta de número. Cores e CSS customizado vêm do campo `theme` do evento, então cada campanha pode ter identidade visual própria sem tocar código.
- **`components/DrawReveal.tsx`** — o elemento visual do sorteio: cada dígito do número vencedor gira e trava da esquerda pra direita, como um bombo de sorteio mecânico. Esse é o "momento" que o briefing pediu (números embaralhando até revelar o vencedor).

Também tem agora o **painel admin funcional**, com a identidade visual da AS Brasil (degradê navy `#0A1330`→`#1B2A5C` + acento indigo `#4F5FFF`):

- **`app/admin/login`** — tela de login, split screen no mesmo padrão do onboarding de afiliados.
- **`app/admin/events/new`** — wizard de criação de evento em 5 etapas (Detalhes → Tema → Participantes → Prêmios → Publicar), cada etapa salvando no banco antes de avançar.
- **`components/wizard/ThemeStep.tsx`** — editor visual de tema com presets e cor por campo, sem precisar programar CSS (a opção de CSS customizado continua disponível pra quem quiser).
- **`components/wizard/ParticipantsStep.tsx`** — escolha entre importar planilha (com mapeamento de colunas) ou habilitar inscrição pública.
- **`components/wizard/PrizesStep.tsx`** e **`PublishStep.tsx`** — cadastro dos prêmios e publicação final.
- **`app/admin/events`** — listagem de eventos com contadores.
- **`app/admin/events/[id]`** — dashboard do evento: estatísticas, lista de prêmios e o botão "Sortear agora", que dispara `PrizeDrawPanel` + `DrawReveal` (a animação do bombo mecânico) e mostra o vencedor ao final.

- **`app/admin/events/[id]/participants`** — tabela de participantes com busca (com debounce), paginação de 50 em 50, exclusão individual e exportação em CSV (via streaming, sem carregar tudo na memória). Essa era a peça que faltava pro requisito de 10.000+ participantes ter uma UI de verdade, não só a API.

- **`app/e/[slug]/vencedores`** — página pública de vencedores, com foto (quando
  publicada) ou um placeholder até lá. Publicar é uma ação explícita do admin
  (botão "Publicar resultado" no painel de sorteio), não automática.
- **Arquivos de configuração** para o projeto realmente rodar:
  `tsconfig.json`, `next.config.js`, `next-env.d.ts`, `app/layout.tsx`, `.gitignore`,
  `prisma/seed.ts` (cria o primeiro admin) e um guia `TESTING.md` passo a passo.

## 3. Jornada do participante (entrada por e-mail, sem senha)

Substitui o formulário simples de "consulte seu número" por um fluxo completo:

- **`/entrar`** — tela de entrada só com e-mail, no mesmo padrão visual (split screen)
  do programa de afiliados da AS Brasil. Sem senha: se o e-mail existe em algum
  evento ativo, abre uma sessão leve em cookie (30 dias) e segue para `/meus-eventos`.
  Se não existe, mostra a mensagem sem revelar mais detalhes.
- **`/meus-eventos`** — lista todos os eventos ativos em que aquele e-mail participa
  (uma pessoa pode estar em vários), cada um com o número dela naquele evento.
- **`/e/[slug]/painel`** — painel pessoal do evento: número do participante em
  destaque, e um **caminho de sorteios** no topo (`PrizePath`) — cada prêmio é um nó
  no caminho, com três estados visuais: `locked` (apagado, ainda não é a vez dele),
  `current` (aceso, o próximo sorteio relevante) e `completed` (já sorteado, com
  troféu se essa pessoa ganhou). Todos os nós são clicáveis.
- **`/e/[slug]/painel/premio/[prizeId]`** — tela de um sorteio específico: se já
  saiu o resultado, mostra se a pessoa ganhou ou não e quem ganhou; se ainda não
  saiu, mostra contagem regressiva (`Countdown`) até a data marcada e reforça o
  número da pessoa.
- **`ParticipantTopNav`** — barra fixa em todas as telas pessoais, com "← Meus
  eventos" e "Sair".

Os espaços de imagem (logo, banner, foto de cada prêmio) estão como placeholders
(ícones/cores) de propósito — combinamos deixar isso para depois.

## 4. O que fica como próximo passo (não coube num único pacote de referência)

Sendo direto sobre o que falta pra produção:

- **Upload de imagens** para S3/R2 com URLs assinadas (banners, logos, imagens de prêmio, foto do vencedor). A página de vencedores e o botão "Publicar resultado" já existem; falta só o mecanismo de upload em si — hoje `winnerPhotoUrl` fica vazio a menos que seja preenchido direto no banco.
- **Edição depois de criado** — hoje o wizard só cobre a criação; editar um evento existente (trocar tema, adicionar mais prêmios, reimportar) ainda não tem tela própria, embora as rotas de API já suportem.
- **Fila de importação** (BullMQ/Inngest) se planilhas passarem de ~50–100k linhas — a versão atual processa tudo dentro da própria requisição HTTP, o que é seguro até um volume alto mas não é infinito.
- **Reforço de rate limiting** com Redis (a versão atual é em memória, ok pra uma instância só).
- **RBAC** (papéis ADMIN vs OPERADOR) — o campo já existe em `AdminUser.role`, falta aplicar nas rotas.
- **Testes automatizados** do pipeline de importação e do sorteio (especialmente o `verifyDraw` de auditoria).

## 5. Decisões técnicas que tomei sem especificação explícita

- **Formato do número de sorteio**: dígitos suficientes pra manter a faixa de números com no máximo ~60% de ocupação (evita números "óbvios" e mantém a sensação de sorteio real, tipo "8472").
- **Onde fica a regra "vencedor continua ou sai"**: por evento (`Event.winnerPolicy`), não por prêmio — é isso que o briefing descreveu ("essa configuração deve ser definida pelo administrador" no nível do evento).
- **Sorteio como transação única**: gravar o resultado, marcar o prêmio como sorteado e (se aplicável) remover o vencedor dos próximos sorteios acontece tudo dentro de uma `$transaction`, pra nunca ficar num estado inconsistente.
- **`/api/public/lookup` e `NumberLookupForm` ficaram no código mas sem uso** — foram substituídos pela jornada `/entrar` → `/meus-eventos` → painel. Dá pra remover com segurança se não for mais usar o formulário simples em algum outro lugar.
