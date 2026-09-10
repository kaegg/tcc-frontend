import path from "node:path"
import { loadEnv } from "vite"
import { defineConfig } from "vitest/config"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

/** Porta do dev server. Precisa bater com CORS_ORIGIN no backend. */
const DEV_PORT = 5173

const FALLBACK_API_URL = `http://localhost:3000/api`

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, import.meta.dirname, "VITE_")

  // A URL da API é embutida no bundle em tempo de build. Faltando no build, o
  // deploy sobe e só quebra na primeira requisição, com um endereço
  // "undefined/categories" que parece problema de servidor. Falhar aqui torna o
  // erro visível antes de existir bundle quebrado.
  if (command === "build" && !env.VITE_API_URL) {
    throw new Error(
      "VITE_API_URL não está definida. Copie .env.example para .env e ajuste a URL da API.",
    )
  }

  if (command === "serve" && !env.VITE_API_URL) {
    console.warn(
      `[env] VITE_API_URL não definida; usando ${FALLBACK_API_URL}. ` +
        "Copie .env.example para .env para configurar.",
    )
  }

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      // Espelha o alias "@/*" declarado em tsconfig.app.json. O TypeScript lê os
      // paths do tsconfig, mas o Vite precisa da configuração própria.
      alias: {
        "@": path.resolve(import.meta.dirname, "src"),
      },
    },
    test: {
      environment: "jsdom",
      setupFiles: ["./src/test/setup.ts"],
      css: false,
      env: {
        // Sem isto `src/lib/env.ts` cai no padrao e avisa a cada arquivo.
        VITE_API_URL: "http://localhost:3000/api",
        // O runner de CI roda em UTC. Sem fuso fixo, os testes que provam que
        // data civil nao escorrega um dia passariam sem testar nada.
        TZ: "America/Sao_Paulo",
      },
    },
    server: {
      port: DEV_PORT,
      // Sem isto, com a 5173 ocupada o Vite sobe na 5174 em silêncio. A origem
      // muda, o backend passa a bloquear tudo por CORS, e o sintoma é
      // "Failed to fetch" em todas as telas com a API respondendo no curl.
      strictPort: true,
    },
  }
})
