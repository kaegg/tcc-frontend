import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { isApiError } from "@/lib/api/errors"
import {
  amountToApi,
  createTransaction,
  deleteTransaction,
  updateTransaction,
} from "@/lib/api/transactions"

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
  categoryName: "Alimentação",
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

describe("updateTransaction", () => {
  it("envia PATCH /transactions/:id com o formulário inteiro, sem dono nem origem", async () => {
    responde({ ...CRIADO, amount: "42.00" }, 200)

    const salvo = await updateTransaction(CRIADO.id, {
      ...ENTRADA,
      amount: "42.00",
    })

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(new URL(url).pathname).toBe(`/api/transactions/${CRIADO.id}`)
    expect(init.method).toBe("PATCH")
    expect(JSON.parse(init.body as string)).toEqual({
      ...ENTRADA,
      amount: "42.00",
    })
    expect(salvo.amount).toBe("42.00")
  })

  it("codifica o id na URL", async () => {
    responde(CRIADO, 200)

    await updateTransaction("../users/me", ENTRADA)

    const [url] = fetchMock.mock.calls[0] as [string]
    expect(url).toContain("/transactions/..%2Fusers%2Fme")
  })
})

describe("deleteTransaction", () => {
  it("envia DELETE /transactions/:id sem corpo e aceita 204", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 204 }))

    await expect(deleteTransaction(CRIADO.id)).resolves.toBeNull()

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(new URL(url).pathname).toBe(`/api/transactions/${CRIADO.id}`)
    expect(init.method).toBe("DELETE")
    expect(init.body).toBeUndefined()
  })

  it("propaga o 404 de lançamento que não existe mais", async () => {
    responde(
      {
        statusCode: 404,
        error: "Not Found",
        message: "Lançamento não encontrado.",
        path: `/api/transactions/${CRIADO.id}`,
        timestamp: "2026-09-24T12:00:00.000Z",
      },
      404,
    )

    const erro = await deleteTransaction(CRIADO.id).catch((e: unknown) => e)

    expect(isApiError(erro) && erro.statusCode).toBe(404)
  })
})
