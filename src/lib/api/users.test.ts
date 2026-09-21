import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { isApiError } from "@/lib/api/errors"
import { createUser } from "@/lib/api/users"

const CADASTRO = {
  name: "Kauan Eguchi",
  email: "kauan@exemplo.com",
  password: "SenhaValida123",
}

const USUARIO_CRIADO = {
  id: "0199a1b2-c3d4-7000-8000-000000000001",
  name: CADASTRO.name,
  email: CADASTRO.email,
  createdAt: "2026-09-10T12:00:00.000Z",
}

let fetchMock: ReturnType<typeof vi.fn>

function responde(body: unknown, status = 200) {
  fetchMock.mockImplementation(() =>
    Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
    ),
  )
}

const requisicao = () => fetchMock.mock.calls[0][1] as RequestInit

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal("fetch", fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("createUser", () => {
  it("envia POST para /users com os três campos do contrato", async () => {
    responde(USUARIO_CRIADO, 201)

    await createUser(CADASTRO)

    expect(String(fetchMock.mock.calls[0][0])).toBe(
      "http://localhost:3000/api/users",
    )
    expect(requisicao().method).toBe("POST")
    expect(JSON.parse(String(requisicao().body))).toEqual(CADASTRO)
  })

  it("não envia a confirmação de senha", async () => {
    responde(USUARIO_CRIADO, 201)

    await createUser(CADASTRO)

    // `forbidNonWhitelisted` no backend recusa a requisição inteira se um campo
    // fora do contrato chegar, então isto quebraria o cadastro por completo.
    expect(String(requisicao().body)).not.toContain("passwordConfirmation")
  })

  it("devolve o usuário validado pelo schema", async () => {
    responde(USUARIO_CRIADO, 201)

    await expect(createUser(CADASTRO)).resolves.toEqual(USUARIO_CRIADO)
  })

  it("recusa resposta fora do contrato", async () => {
    responde({ id: 123 }, 201)

    await expect(createUser(CADASTRO)).rejects.toMatchObject({
      kind: "contrato",
    })
  })

  it("expõe os erros por campo de um 400", async () => {
    responde(
      {
        statusCode: 400,
        error: "Bad Request",
        message: ["Informe um e-mail válido."],
        path: "/api/users",
        timestamp: "2026-09-10T12:00:00.000Z",
        fieldErrors: { email: ["Informe um e-mail válido."] },
      },
      400,
    )

    const erro = await createUser(CADASTRO).catch((e: unknown) => e)

    expect(isApiError(erro) && erro.fieldErrors).toEqual({
      email: ["Informe um e-mail válido."],
    })
  })

  it("expõe o e-mail duplicado como erro do campo e-mail", async () => {
    responde(
      {
        statusCode: 409,
        error: "Conflict",
        message: "Este e-mail já está cadastrado.",
        path: "/api/users",
        timestamp: "2026-09-10T12:00:00.000Z",
        fieldErrors: { email: ["Este e-mail já está cadastrado."] },
      },
      409,
    )

    const erro = await createUser(CADASTRO).catch((e: unknown) => e)

    expect(isApiError(erro) && erro.statusCode).toBe(409)
    expect(isApiError(erro) && erro.fieldErrors?.email).toEqual([
      "Este e-mail já está cadastrado.",
    ])
  })

  it("não repete um 409, que não melhora por insistência", async () => {
    responde(
      {
        statusCode: 409,
        error: "Conflict",
        message: "Este e-mail já está cadastrado.",
        path: "/api/users",
        timestamp: "2026-09-10T12:00:00.000Z",
      },
      409,
    )

    const erro = await createUser(CADASTRO).catch((e: unknown) => e)

    expect(isApiError(erro) && erro.isRetryable).toBe(false)
  })
})
