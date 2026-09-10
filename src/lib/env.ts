/**
 * Variáveis de ambiente, lidas e validadas uma vez.
 *
 * O valor é embutido pelo Vite em tempo de build, então "configurável por
 * ambiente" significa um build por ambiente. Para trocar o endereço sem
 * recompilar, sirva a API no mesmo domínio atrás de um proxy reverso e use um
 * caminho relativo (`VITE_API_URL=/api`) — por isso o formato relativo é aceito.
 */

const FALLBACK_API_URL = "http://localhost:3000/api"

function readApiBaseUrl(): string {
  const raw = import.meta.env.VITE_API_URL?.trim()

  if (!raw) {
    if (import.meta.env.DEV) {
      console.warn(
        `[env] VITE_API_URL não definida; usando ${FALLBACK_API_URL}. ` +
          "Copie .env.example para .env para configurar.",
      )
      return FALLBACK_API_URL
    }

    throw new Error(
      "VITE_API_URL não foi definida no build. Copie .env.example para .env e recompile.",
    )
  }

  if (!isAbsoluteUrl(raw) && !raw.startsWith("/")) {
    throw new Error(
      `VITE_API_URL inválida: "${raw}". Use uma URL absoluta (http://host:porta/api) ` +
        "ou um caminho começando com barra (/api).",
    )
  }

  // A barra final é removida aqui para que o cliente possa concatenar caminhos
  // que sempre começam com "/", sem gerar "//" no meio da URL.
  return raw.replace(/\/+$/, "")
}

function isAbsoluteUrl(value: string): boolean {
  try {
    const url = new URL(value)
    return url.protocol === "http:" || url.protocol === "https:"
  } catch {
    return false
  }
}

/** URL base da API, sem barra final e já com o prefixo `/api`. */
export const apiBaseUrl = readApiBaseUrl()
