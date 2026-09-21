import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { isApiError } from "@/lib/api/errors"
import { amountToApi, createTransaction } from "@/lib/api/transactions"

const ENTRADA = {
  type: "despesa" as const,
  amount: "35.90",
  categoryId: "0199a1b2-c3d4-7000-8000-000000000002",
  date: "2026-09-21",
  description: "Almoço no restaurante do campus",
}

const CRIADO = {
  id: "0199a1b2-c3d4-7000-8000-0000000000f1",
  ...ENTRADA,
  source: "formulario",
  createdAt: "2026-09-21T15:00:00.000Z",
  updatedAt: "2026-09-21T15:00:00.000Z",
}

let fetchMock: ReturnType<typeof vi.fn>

function responde(body: unknown, status: number) {
  fetchMock.mockImplementation(() =>
    Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
    ),
  )
}

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal("fetch", fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("amountToApi", () => {
  it.each([
    [35.9, "35.90"],
    [35, "35.00"],
    [0.01, "0.01"],
    [1234.5, "1234.50"],
  ])("%s vira %s", (valor, esperado) => {
    expect(amountToApi(valor)).toBe(esperado)
  })
})

describe("createTransaction", () => {
  it("envia POST /transactions com o valor em texto e sem dono nem origem", async () => {
    responde(CRIADO, 201)

    const criado = await createTransaction(ENTRADA)

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(new URL(url).pathname).toBe("/api/transactions")
    expect(init.method).toBe("POST")
    expect(JSON.parse(init.body as string)).toEqual(ENTRADA)
    expect(criado.amount).toBe("35.90")
  })

  it("carrega o erro por campo do backend", async () => {
    const mensagem =
      "A categoria precisa ser compatível com o tipo do lançamento."
    responde(
      {
        statusCode: 400,
        error: "Bad Request",
        message: [mensagem],
        fieldErrors: { categoryId: [mensagem] },
        path: "/api/transactions",
        timestamp: "2026-09-21T15:00:00.000Z",
      },
      400,
    )

    const erro = await createTransaction(ENTRADA).catch((e: unknown) => e)

    expect(isApiError(erro) && erro.fieldErrors).toHaveProperty("categoryId")
  })

  it("resposta fora do contrato vira falha de contrato, não dado pela metade", async () => {
    responde({ id: "1" }, 201)

    const erro = await createTransaction(ENTRADA).catch((e: unknown) => e)

    expect(isApiError(erro) && erro.kind).toBe("contrato")
  })
})
