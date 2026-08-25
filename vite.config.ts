import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // Espelha o alias "@/*" declarado em tsconfig.app.json. O TypeScript lê os
    // paths do tsconfig, mas o Vite precisa da configuração própria.
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
});
