import js from "@eslint/js"
import globals from "globals"
import reactHooks from "eslint-plugin-react-hooks"
import reactRefresh from "eslint-plugin-react-refresh"
import tseslint from "typescript-eslint"
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended"
import { defineConfig, globalIgnores } from "eslint/config"

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
      // Por ultimo: desliga as regras de estilo que conflitam e passa a
      // reprovar formatacao, para `npm run lint` cobrir lint e formato juntos.
      eslintPluginPrettierRecommended,
    ],
    languageOptions: {
      globals: globals.browser,
    },
  },
  {
    // Gerados e regerados pelo shadcn CLI. Co-exportam variantes cva junto do
    // componente, o que o react-refresh sinaliza, e formata-los aqui geraria
    // diff toda vez que o CLI reescrevesse o arquivo.
    files: ["src/components/ui/**/*.{ts,tsx}"],
    rules: {
      "react-refresh/only-export-components": "off",
      "prettier/prettier": "off",
    },
  },
])
