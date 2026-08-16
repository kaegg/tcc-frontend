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
│   ├── assets/         # imagens e outros assets importados pelo código
│   ├── components/
│   │   └── ui/          # componentes gerados/gerenciados pelo Shadcn/UI CLI
│   ├── lib/             # utilitários compartilhados (ex.: lib/utils.ts -> cn())
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css        # entrypoint do Tailwind + tokens de tema (light/dark)
├── components.json     # config do Shadcn/UI CLI
├── vite.config.ts
└── tsconfig*.json
```

O alias `@/*` aponta para `src/*` (configurado em `tsconfig.app.json` e usado pelo Shadcn/UI para gerar imports como `@/lib/utils` e `@/components/ui/...`).

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
