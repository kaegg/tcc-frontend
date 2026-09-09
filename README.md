# IntelliFinance — Frontend

Frontend do TCC "Desenvolvimento de um sistema web de gestão financeira com suporte a interface conversacional utilizando LLM" (UEM, 2026).

## Stack

- **React 19** + **TypeScript**, com **Vite** como bundler/dev server.
- **Tailwind CSS v4** (via `@tailwindcss/vite`) + **Shadcn/UI** (`base-nova` style, ícones via `lucide-react`).
- **React Router** para navegação, **TanStack Query** e **React Hook Form + Zod** para dados e formulários.
- **Socket.IO client** para a comunicação em tempo real com o chatbot (backend NestJS).

## Estrutura de diretórios

```
tcc-frontend/
├── public/            # assets estáticos servidos diretamente (favicon, ícones svg)
├── src/
│   ├── components/
│   │   ├── app/         # componentes das telas privadas (sidebar, cards, gráficos)
│   │   ├── auth/        # componentes das telas de autenticação
│   │   ├── brand/       # logo e elementos de marca
│   │   └── ui/          # componentes gerados/gerenciados pelo Shadcn/UI CLI
│   ├── hooks/           # hooks compartilhados (use-session, use-categories, use-api-health)
│   ├── layouts/         # shells de página (auth-layout e app-layout)
│   ├── lib/
│   │   ├── api/         # cliente HTTP, schemas Zod dos contratos e estado de sessão
│   │   ├── env.ts       # leitura e validação das variáveis de ambiente
│   │   └── ...          # tipos, formatação, cálculos e dados de demonstração
│   ├── pages/           # uma pasta/arquivo por tela
│   │   ├── app/          # dashboard, lançamentos, relatórios, assistente, perfil
│   │   └── auth/         # login, cadastro e schemas de validação
│   ├── routes/          # definição de rotas, paths e guard das rotas privadas
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css        # entrypoint do Tailwind + design tokens do tema
├── components.json     # config do Shadcn/UI CLI
├── vite.config.ts
└── tsconfig*.json
```

O alias `@/*` aponta para `src/*`. Ele precisa estar declarado em **dois** lugares: em
`tsconfig.app.json` (para o type-check e o editor) e em `vite.config.ts` (para o bundler
resolver os imports em tempo de execução).

## Rotas

Rotas públicas e privadas são declaradas em blocos separados em `src/routes/app-router.tsx`;
os caminhos ficam centralizados em `src/routes/paths.ts`. Tudo que estiver sob
`ProtectedRoute` exige sessão ativa e, sem ela, redireciona para o login guardando a rota
pretendida.

## Configuração

```bash
cp .env.example .env
```

| Variável | Para que serve |
|---|---|
| `VITE_API_URL` | URL base da API REST, **já com o prefixo `/api`** (padrão: `http://localhost:3000/api`) |

A URL é embutida no bundle em tempo de **build**, não lida em tempo de execução: cada ambiente
precisa do seu próprio build. Faltando no build, o `vite.config.ts` interrompe com erro — é
deliberado, porque sem isso o deploy subiria e só quebraria na primeira requisição, com um endereço
`undefined/categories` que parece problema de servidor. Em `npm run dev` a ausência só gera aviso e
cai no padrão, para que clonar e rodar continue funcionando sem passo extra.

Para trocar o endereço sem recompilar, sirva a API no mesmo domínio atrás de um proxy reverso e use
um caminho relativo: `VITE_API_URL=/api`.

O dev server roda na **5173 com `strictPort`**. Sem isso, com a porta ocupada o Vite subiria na 5174
em silêncio, a origem mudaria e o backend passaria a bloquear tudo por CORS — com o sintoma de
"Failed to fetch" em todas as telas e a API respondendo normalmente no `curl`.

> Um bloqueio de CORS é indistinguível de servidor fora pelo JavaScript: o navegador entrega
> `TypeError: Failed to fetch` nos dois casos e só conta o motivo no console. Se a API responde no
> `curl` mas não no navegador, CORS é a primeira suspeita.

## Comunicação com a API

O cliente fica em `src/lib/api/client.ts` e usa `fetch` nativo, sem dependência nova.

- **Contratos validados em tempo de execução.** `src/lib/api/schemas.ts` guarda os schemas Zod, e os
  tipos saem de `z.infer` — os schemas são a fonte única. Resposta fora do formato vira falha
  explícita, em vez de renderização parcial em silêncio.
- **Erros normalizados** em `ApiError`, com `kind` distinguindo `rede`, `tempo`, `http` e `contrato`.
  O campo `message` do backend chega como string ou como lista (uma por violação do `ValidationPipe`)
  e é sempre normalizado para lista.
- **Token em memória** (`src/lib/api/auth-token.ts`), nunca em `localStorage`: o que está no
  armazenamento do navegador é legível por qualquer script, então um único XSS entregaria a
  credencial. A persistência entre recarregamentos fica com o cookie httpOnly de refresh, na TCC-009.
- **Sessão expirada** — um 401 limpa o token e marca a sessão em `src/lib/api/session-store.ts`; as
  rotas protegidas redirecionam guardando a rota pretendida, e o login limpa a marca ao entrar.

Onde cada erro aparece na interface:

| Origem | Onde |
|---|---|
| Rede ou tempo esgotado | `Alert` no topo, com "Tentar novamente" |
| Falha ao carregar dado auxiliar | `Alert` no topo e campo desabilitado — nunca `FieldError`, porque não é erro do campo |
| Validação no cliente (Zod) | `FieldError` com `aria-invalid` e `aria-describedby` |
| Validação no servidor (400) | `Alert` no topo, listando as mensagens |
| Sessão expirada (401) | Aviso único e redirecionamento para o login |

`ApiStatusBanner` fica no `AppLayout` e consulta `GET /api/health`. No caminho feliz não renderiza
nada e não consulta de novo; só volta a verificar, a cada 30 segundos, enquanto houver problema.

## Comandos

```bash
npm install       # instala as dependências
npm run dev       # inicia o servidor de desenvolvimento (Vite)
npm run build     # type-check (tsc -b) + build de produção em dist/
npm run preview   # serve o build de produção localmente
npm run lint      # roda o ESLint no projeto
```

Para adicionar novos componentes do Shadcn/UI:

```bash
npx shadcn add <componente>
```
