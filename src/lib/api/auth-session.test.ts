import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const AUTH = {
  accessToken: "token-novo",
  tokenType: "Bearer",
  expiresIn: 900,
  user: {
    id: "0199a1b2-c3d4-7000-8000-00000000000a",
    name: "Ana Souza",
    email: "ana@exemplo.com",
    createdAt: "2026-09-01T12:00:00.000Z",
  },
}

const ERRO_401 = {
  statusCode: 401,
  error: "Unauthorized",
  message: "Sessão inválida ou expirada.",
  path: "/api/auth/refresh",
  timestamp: "2026-09-21T12:00:00.000Z",
}

let fetchMock: ReturnType<typeof vi.fn>

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })

/** Módulos com estado próprio a cada teste: a sessão vive em variável de módulo. */
async function carrega() {
  vi.resetModules()
  const [sessao, token, cliente, expiracao, schemas] = await Promise.all([
    import("@/lib/api/auth-session"),
    import("@/lib/api/auth-token"),
    import("@/lib/api/client"),
    import("@/lib/api/session-store"),
    import("@/lib/api/schemas"),
  ])
  return { sessao, token, cliente, expiracao, schemas }
}

const urlsChamadas = () => fetchMock.mock.calls.map((c) => String(c[0]))

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal("fetch", fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("restoreSession", () => {
  it("restaura a sessão pelo cookie e guarda o token só em memória", async () => {
    fetchMock.mockImplementation(() => Promise.resolve(json(AUTH)))
    const { sessao, token } = await carrega()

    await expect(sessao.restoreSession()).resolves.toBe(true)

    expect(token.getAccessToken()).toBe("token-novo")
    expect(localStorage.length).toBe(0)
    expect(sessionStorage.length).toBe(0)
    expect(fetchMock.mock.calls[0][1]).toMatchObject({
      method: "POST",
      credentials: "include",
    })
  })

  it("sem cookie válido fica anônima, sem marcar sessão expirada", async () => {
    fetchMock.mockImplementation(() => Promise.resolve(json(ERRO_401, 401)))
    const { sessao, token, expiracao } = await carrega()

    await expect(sessao.restoreSession()).resolves.toBe(false)

    expect(token.getAccessToken()).toBeNull()
    // Quem nunca entrou não deve ver o aviso de "sua sessão expirou".
    expect(expiracao.markSessionExpired()).toBe(true)
  })

  it("chamadas simultâneas compartilham uma única renovação", async () => {
    fetchMock.mockImplementation(() => Promise.resolve(json(AUTH)))
    const { sessao } = await carrega()

    await Promise.all([
      sessao.refreshSession(),
      sessao.refreshSession(),
      sessao.restoreSession(),
    ])

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})

describe("signIn e signOut", () => {
  it("entrar guarda o token e limpa o aviso de expiração", async () => {
    fetchMock.mockImplementation(() => Promise.resolve(json(AUTH)))
    const { sessao, token, expiracao } = await carrega()
    expiracao.markSessionExpired()

    await sessao.signIn({
      email: "ana@exemplo.com",
      password: "SenhaValida123",
    })

    expect(token.getAccessToken()).toBe("token-novo")
    expect(expiracao.markSessionExpired()).toBe(true)
  })

  it("credencial recusada não deixa token nem sessão", async () => {
    fetchMock.mockImplementation(() =>
      Promise.resolve(
        json({ ...ERRO_401, message: "E-mail ou senha incorretos." }, 401),
      ),
    )
    const { sessao, token } = await carrega()

    await expect(
      sessao.signIn({ email: "ana@exemplo.com", password: "errada" }),
    ).rejects.toMatchObject({ statusCode: 401 })

    expect(token.getAccessToken()).toBeNull()
  })

  it("sair chama o logout, apaga o token e confirma", async () => {
    fetchMock
      .mockImplementationOnce(() => Promise.resolve(json(AUTH)))
      .mockImplementationOnce(() =>
        Promise.resolve(new Response(null, { status: 204 })),
      )
    const { sessao, token } = await carrega()
    await sessao.signIn({
      email: "ana@exemplo.com",
      password: "SenhaValida123",
    })

    await expect(sessao.signOut()).resolves.toBe(true)

    expect(urlsChamadas()[1]).toContain("/auth/logout")
    expect(token.getAccessToken()).toBeNull()
  })

  it("sai da interface mesmo sem o servidor confirmar, e avisa", async () => {
    fetchMock
      .mockImplementationOnce(() => Promise.resolve(json(AUTH)))
      .mockImplementationOnce(() =>
        Promise.reject(new TypeError("Failed to fetch")),
      )
    const { sessao, token } = await carrega()
    await sessao.signIn({
      email: "ana@exemplo.com",
      password: "SenhaValida123",
    })

    await expect(sessao.signOut()).resolves.toBe(false)

    expect(token.getAccessToken()).toBeNull()
  })
})

describe("renovação automática no cliente HTTP", () => {
  it("um 401 renova a sessão e repete a requisição uma vez com o token novo", async () => {
    const { sessao, token, cliente, schemas } = await carrega()
    void sessao
    token.setAccessToken("token-vencido")

    fetchMock
      .mockImplementationOnce(() => Promise.resolve(json(ERRO_401, 401)))
      .mockImplementationOnce(() => Promise.resolve(json(AUTH)))
      .mockImplementationOnce(() => Promise.resolve(json({ data: [] })))

    await cliente.apiGet("/categories", schemas.categoryListSchema)

    expect(urlsChamadas().map((u) => new URL(u).pathname)).toEqual([
      "/api/categories",
      "/api/auth/refresh",
      "/api/categories",
    ])
    const repetida = fetchMock.mock.calls[2][1] as RequestInit
    expect((repetida.headers as Headers).get("Authorization")).toBe(
      "Bearer token-novo",
    )
  })

  it("se a renovação falha, marca a sessão como expirada", async () => {
    const { sessao, cliente, schemas, expiracao } = await carrega()
    void sessao
    fetchMock.mockImplementation(() => Promise.resolve(json(ERRO_401, 401)))

    await expect(
      cliente.apiGet("/categories", schemas.categoryListSchema),
    ).rejects.toMatchObject({ statusCode: 401 })

    expect(urlsChamadas()).toHaveLength(2)
    // Já marcada: a primeira chamada de uma sequência é quem devolve true.
    expect(expiracao.markSessionExpired()).toBe(false)
  })

  it("não entra em laço quando o token renovado também recebe 401", async () => {
    const { sessao, cliente, schemas } = await carrega()
    void sessao
    fetchMock
      .mockImplementationOnce(() => Promise.resolve(json(ERRO_401, 401)))
      .mockImplementationOnce(() => Promise.resolve(json(AUTH)))
      .mockImplementationOnce(() => Promise.resolve(json(ERRO_401, 401)))

    await expect(
      cliente.apiGet("/categories", schemas.categoryListSchema),
    ).rejects.toMatchObject({ statusCode: 401 })

    expect(fetchMock).toHaveBeenCalledTimes(3)
  })
})
