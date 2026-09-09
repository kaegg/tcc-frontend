/// <reference types="vite/client" />

/**
 * Variáveis de ambiente do frontend.
 *
 * Isto dá autocomplete e checagem de nome, mas não protege de verdade: o
 * `ImportMetaEnv` do Vite declara um índice genérico, então um erro de digitação
 * compila e vale `undefined`. A proteção real está em `src/lib/env.ts`, que
 * valida em tempo de execução, e em `vite.config.ts`, que falha o build.
 */
interface ImportMetaEnv {
  /** URL base da API REST, já com o prefixo `/api`. */
  readonly VITE_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
