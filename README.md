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
│   ├── hooks/           # hooks compartilhados (ex.: use-session)
│   ├── layouts/         # shells de página (auth-layout e app-layout)
│   ├── lib/             # tipos, formatação, cálculos e dados de demonstração
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
