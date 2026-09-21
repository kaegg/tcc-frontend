import type { z } from "zod"

import { getAccessToken, clearAccessToken } from "@/lib/api/auth-token"
import {
  ApiError,
  defaultMessageForStatus,
  type ApiErrorKind,
} from "@/lib/api/errors"
import {
  BACKEND_UNAVAILABLE_MESSAGE,
  CONTRACT_MESSAGE,
  TIMEOUT_MESSAGE,
} from "@/lib/api/messages"
import { apiErrorBodySchema } from "@/lib/api/schemas"
import { markSessionExpired } from "@/lib/api/session-store"
import { apiBaseUrl } from "@/lib/env"

/** Teto de espera por resposta. Acima disso a interface prefere avisar a travar. */
const DEFAULT_TIMEOUT_MS = 10_000

export type QueryParams = Record<
  string,
  string | number | boolean | undefined | null
>

export type RequestOptions<T> = {
  /** Schema que valida a resposta. É o que torna o contrato verificável. */
  schema: z.ZodType<T>
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE"
  body?: unknown
  query?: QueryParams
  /** Cancelamento externo, combinado com o tempo limite interno. */
  signal?: AbortSignal
  timeoutMs?: number
  /**
   * Impede que um 401 seja interpretado como sessão expirada.
   *
   * Necessário nas rotas de autenticação: o 401 de `/auth/login` significa
   * "credencial errada", e tratá-lo como expiração jogaria o usuário para a
   * tela de login que ele já está vendo.
   */
  skipAuthHandling?: boolean
  /**
   * Status fora da faixa 2xx que ainda devem ser lidos com `schema`.
   *
   * Existe para `GET /health`, o único endpoint que responde 503 com um corpo
   * normal em vez do envelope de erro — é assim que ele informa QUAL
   * dependência caiu. Sem isto, a resposta cairia no caminho de erro e a
   * distinção entre "degradado" e "sem resposta" se perderia.
   */
  acceptStatuses?: number[]
}

/**
 * Monta a URL final.
 *
 * Concatenação, e não `new URL(path, base)`: como `api` é um segmento de
 * caminho e não um diretório, `new URL("/health", "http://host:3000/api")`
 * devolve "http://host:3000/health" e o prefixo desaparece. O sintoma seria
 * todas as chamadas respondendo 404 com o envelope do servidor, parecendo
 * "recurso não encontrado" em vez de "URL montada errada".
 */
function buildUrl(path: string, query?: QueryParams): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`
  const url = `${apiBaseUrl}${normalizedPath}`

  if (!query) return url

  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue
    search.append(key, String(value))
  }

  const queryString = search.toString()
  return queryString ? `${url}?${queryString}` : url
}

function buildHeaders(hasBody: boolean): Headers {
  const headers = new Headers({ Accept: "application/json" })

  // Só com corpo: `Content-Type: application/json` não é um header seguro por
  // padrão, então mandá-lo num GET provoca um preflight OPTIONS a cada
  // requisição, sem nenhum ganho.
  if (hasBody) headers.set("Content-Type", "application/json")

  const token = getAccessToken()
  if (token) headers.set("Authorization", `Bearer ${token}`)

  return headers
}

/** Lê o corpo sem quebrar em resposta vazia ou em resposta que não é JSON. */
async function readJson(response: Response): Promise<unknown> {
  if (
    response.status === 204 ||
    response.headers.get("Content-Length") === "0"
  ) {
    return null
  }

  try {
    return await response.json()
  } catch {
    // Acontece quando um proxy mal configurado devolve HTML. O texto bruto não
    // pode chegar ao usuário como se fosse mensagem da aplicação.
    return null
  }
}

/** Converte o envelope de erro do backend em `ApiError`. */
function toApiError(
  response: Response,
  payload: unknown,
  path: string,
): ApiError {
  const parsed = apiErrorBodySchema.safeParse(payload)

  if (!parsed.success) {
    return new ApiError({
      kind: "http",
      statusCode: response.status,
      message: defaultMessageForStatus(response.status),
      path,
    })
  }

  const { message, fieldErrors } = parsed.data
  const messages = Array.isArray(message) ? message : [message]

  return new ApiError({
    kind: "http",
    statusCode: parsed.data.statusCode,
    message: messages[0] ?? defaultMessageForStatus(response.status),
    messages,
    fieldErrors,
    path: parsed.data.path,
  })
}

let refreshHandler: (() => Promise<boolean>) | null = null

/**
 * Registra a renovação de sessão. Injetada, e não importada, porque a
 * renovação usa este próprio cliente: importá-la fecharia um ciclo de módulos.
 * O handler precisa ter uma única renovação em andamento por vez — várias
 * consultas recebendo 401 juntas disparariam vários refreshes, e o segundo
 * apresentaria um token que o primeiro já trocou.
 */
export function setRefreshHandler(handler: (() => Promise<boolean>) | null) {
  refreshHandler = handler
}

/** Requisição à API, com contrato validado na resposta. */
export async function apiRequest<T>(
  path: string,
  options: RequestOptions<T>,
  isRetry = false,
): Promise<T> {
  const {
    schema,
    method = "GET",
    body,
    query,
    signal,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    skipAuthHandling = false,
    acceptStatuses,
  } = options

  const url = buildUrl(path, query)
  const hasBody = body !== undefined

  const timeoutSignal = AbortSignal.timeout(timeoutMs)
  const combinedSignal = signal
    ? AbortSignal.any([signal, timeoutSignal])
    : timeoutSignal

  let response: Response

  try {
    response = await fetch(url, {
      method,
      headers: buildHeaders(hasBody),
      body: hasBody ? JSON.stringify(body) : undefined,
      // Sempre: é assim que o cookie httpOnly de refresh (TCC-009) viaja.
      credentials: "include",
      signal: combinedSignal,
    })
  } catch (error) {
    throw toTransportError(error, path, timeoutSignal)
  }

  const payload = await readJson(response)

  const readAsSuccess =
    response.ok || (acceptStatuses?.includes(response.status) ?? false)

  if (!readAsSuccess) {
    const apiError = toApiError(response, payload, path)

    if (apiError.statusCode === 401 && !skipAuthHandling) {
      // Uma única nova tentativa: se o token renovado também levar 401, o
      // problema não é expiração e repetir só faria laço.
      if (!isRetry && refreshHandler && (await refreshHandler())) {
        return apiRequest(path, options, true)
      }

      clearAccessToken()
      markSessionExpired()
    }

    throw apiError
  }

  const parsed = schema.safeParse(payload)

  if (!parsed.success) {
    // Renderizar pela metade em silêncio é pior do que falhar: a tela mostraria
    // número errado sem ninguém perceber.
    throw new ApiError({
      kind: "contrato",
      message: CONTRACT_MESSAGE,
      statusCode: response.status,
      path,
      cause: parsed.error,
    })
  }

  return parsed.data
}

/**
 * Distingue as três formas de o `fetch` não completar.
 *
 * `AbortError` de cancelamento externo é repassado cru, e não convertido em
 * erro de rede: o TanStack Query cancela consultas ao desmontar e o StrictMode
 * do React monta duas vezes em desenvolvimento, então tratá-lo como falha
 * encheria a tela de avisos a cada navegação.
 */
function toTransportError(
  error: unknown,
  path: string,
  timeoutSignal: AbortSignal,
): unknown {
  const isAbort = error instanceof DOMException && error.name === "AbortError"

  if (isAbort && !timeoutSignal.aborted) return error

  const kind: ApiErrorKind = timeoutSignal.aborted ? "tempo" : "rede"

  return new ApiError({
    kind,
    // Um bloqueio de CORS chega aqui indistinguível de servidor fora: o
    // navegador entrega "Failed to fetch" nos dois casos e só conta o motivo
    // no console.
    message: kind === "tempo" ? TIMEOUT_MESSAGE : BACKEND_UNAVAILABLE_MESSAGE,
    path,
    cause: error,
  })
}

export function apiGet<T>(
  path: string,
  schema: z.ZodType<T>,
  options?: Omit<RequestOptions<T>, "schema" | "method" | "body">,
): Promise<T> {
  return apiRequest(path, { ...options, schema, method: "GET" })
}

export function apiPost<T>(
  path: string,
  body: unknown,
  schema: z.ZodType<T>,
  options?: Omit<RequestOptions<T>, "schema" | "method" | "body">,
): Promise<T> {
  return apiRequest(path, { ...options, schema, method: "POST", body })
}
