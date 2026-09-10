import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { z } from "zod"

import { setAccessToken, clearAccessToken } from "@/lib/api/auth-token"
import { apiGet, apiRequest } from "@/lib/api/client"
import { isApiError } from "@/lib/api/errors"
import { categoryListSchema } from "@/lib/api/schemas"
import { clearSessionExpired } from "@/lib/api/session-store"

const okSchema = z.object({ ok: z.boolean() })

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

function corpoDeErro(statusCode: number, message: string | string[]) {
  return {
    statusCode,
    error: "Erro",
    message,
    path: "/api/recurso",
    timestamp: "2026-09-02T21:57:03.482Z",
  }
}

/**
 * O corpo de um Response so pode ser lido uma vez, entao cada chamada precisa
 * de uma instancia nova. Com `mockResolvedValue` o mesmo objeto seria devolvido
 * sempre, e a segunda chamada de um teste receberia um corpo ja consumido.
 */
function responde(body: unknown, status = 200) {
  fetchMock.mockImplementation(() =>
    Promise.resolve(jsonResponse(body, status)),
  )
}

function respondeErro(statusCode: number, message: string | string[]) {
  responde(corpoDeErro(statusCode, message), statusCode)
}

let fetchMock: ReturnType<typeof vi.fn>

/** Última URL que o cliente pediu ao fetch. */
const urlPedida = () => String(fetchMock.mock.calls[0][0])

/** Headers da última requisição. */
const headersPedidos = () =>
  (fetchMock.mock.calls[0][1] as RequestInit).headers as Headers

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal("fetch", fetchMock)
  clearSessionExpired()
  clearAccessToken()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("montagem da URL", () => {
  it("preserva o prefixo /api da URL base", async () => {
    // `new URL("/health", "http://host:3000/api")` descartaria o /api, porque
    // `api` e segmento de caminho e nao diretorio.
    responde({ ok: true })

    await apiGet("/health", okSchema)

    expect(urlPedida()).toBe("http://localhost:3000/api/health")
  })

  it("aceita caminho sem barra inicial", async () => {
    responde({ ok: true })

    await apiGet("health", okSchema)

    expect(urlPedida()).toBe("http://localhost:3000/api/health")
  })

  it("anexa parâmetros de consulta", async () => {
    responde({ data: [] })

    await apiGet("/categories", categoryListSchema, {
      query: { type: "receita" },
    })

    expect(urlPedida()).toBe(
      "http://localhost:3000/api/categories?type=receita",
    )
  })

  it("omite parâmetro indefinido em vez de mandar a string undefined", async () => {
    responde({ data: [] })

    await apiGet("/categories", categoryListSchema, {
      query: { type: undefined },
    })

    expect(urlPedida()).toBe("http://localhost:3000/api/categories")
  })
})

describe("cabeçalhos", () => {
  it("não manda Content-Type sem corpo", async () => {
    // Content-Type nao e header seguro por padrao: num GET provocaria um
    // preflight OPTIONS a cada requisicao, sem ganho nenhum.
    responde({ ok: true })

    await apiGet("/health", okSchema)

    expect(headersPedidos().get("Content-Type")).toBeNull()
    expect(headersPedidos().get("Accept")).toBe("application/json")
  })

  it("manda Content-Type quando há corpo", async () => {
    responde({ ok: true })

    await apiRequest("/recurso", {
      schema: okSchema,
      method: "POST",
      body: { valor: 1 },
    })

    expect(headersPedidos().get("Content-Type")).toBe("application/json")
  })

  it("omite Authorization sem token e inclui com token", async () => {
    responde({ ok: true })
    await apiGet("/health", okSchema)
    expect(headersPedidos().get("Authorization")).toBeNull()

    fetchMock.mockClear()
    setAccessToken("abc123")
    await apiGet("/health", okSchema)
    expect(headersPedidos().get("Authorization")).toBe("Bearer abc123")
  })

  it("envia credenciais, para o cookie de refresh viajar", async () => {
    responde({ ok: true })

    await apiGet("/health", okSchema)

    expect((fetchMock.mock.calls[0][1] as RequestInit).credentials).toBe(
      "include",
    )
  })
})

describe("normalização de erro", () => {
  it("converte message string em lista", async () => {
    respondeErro(404, "Recurso não encontrado.")

    const erro = await apiGet("/recurso", okSchema).catch((e: unknown) => e)

    expect(isApiError(erro) && erro.kind).toBe("http")
    expect(isApiError(erro) && erro.statusCode).toBe(404)
    expect(isApiError(erro) && erro.messages).toEqual([
      "Recurso não encontrado.",
    ])
  })

  it("preserva a lista de mensagens do ValidationPipe", async () => {
    respondeErro(400, [
      "type deve ser receita ou despesa.",
      "property tipo should not exist",
    ])

    const erro = await apiGet("/categories", categoryListSchema).catch(
      (e: unknown) => e,
    )

    expect(isApiError(erro) && erro.messages).toHaveLength(2)
  })

  it("usa mensagem padrão quando o corpo não é do contrato de erro", async () => {
    responde("<html>502</html>", 502)

    const erro = await apiGet("/recurso", okSchema).catch((e: unknown) => e)

    expect(isApiError(erro) && erro.statusCode).toBe(502)
    expect(isApiError(erro) && erro.messages[0]).not.toContain("html")
  })

  it("classifica falha de transporte como erro de rede", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"))

    const erro = await apiGet("/health", okSchema).catch((e: unknown) => e)

    expect(isApiError(erro) && erro.kind).toBe("rede")
  })

  it("classifica resposta fora do contrato como erro de contrato", async () => {
    responde({ data: "não é lista" })

    const erro = await apiGet("/categories", categoryListSchema).catch(
      (e: unknown) => e,
    )

    expect(isApiError(erro) && erro.kind).toBe("contrato")
  })

  it("não repete falha de responsabilidade do cliente", async () => {
    respondeErro(400, "Requisição inválida.")
    const erro400 = await apiGet("/recurso", okSchema).catch((e: unknown) => e)

    respondeErro(503, "Indisponível.")
    const erro503 = await apiGet("/recurso", okSchema).catch((e: unknown) => e)

    expect(isApiError(erro400) && erro400.isRetryable).toBe(false)
    expect(isApiError(erro503) && erro503.isRetryable).toBe(true)
  })
})

describe("status aceitos fora da faixa 2xx", () => {
  it("lê o corpo com o schema de sucesso quando o status é declarado", async () => {
    // O /health responde 503 com corpo normal: e assim que ele informa QUAL
    // dependencia caiu.
    const degradado = {
      status: "degradado",
      timestamp: "2026-09-02T21:57:03.482Z",
      uptimeSeconds: 8,
      dependencies: { database: { status: "indisponivel" } },
    }
    responde(degradado, 503)

    const schema = z.object({ status: z.string() })
    const resposta = await apiRequest("/health", {
      schema,
      acceptStatuses: [503],
    })

    expect(resposta.status).toBe("degradado")
  })

  it("sem o status declarado, o mesmo 503 vira erro", async () => {
    respondeErro(503, "Indisponível.")

    const erro = await apiGet("/health", okSchema).catch((e: unknown) => e)

    expect(isApiError(erro) && erro.kind).toBe("http")
  })
})
