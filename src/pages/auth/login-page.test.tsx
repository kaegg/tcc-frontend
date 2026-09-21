import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { getAccessToken, clearAccessToken } from "@/lib/api/auth-token"
import { LoginPage } from "@/pages/auth/login-page"

const navegou = vi.fn()

vi.mock("react-router-dom", async () => {
  const real =
    await vi.importActual<typeof import("react-router-dom")>("react-router-dom")

  return { ...real, useNavigate: () => navegou }
})

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

function renderizar(): void {
  const client = new QueryClient({
    defaultOptions: { mutations: { retry: false } },
  })

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  )

  render(<LoginPage />, { wrapper })
}

async function preencher(senha = "SenhaValida123"): Promise<void> {
  const user = userEvent.setup()

  await user.type(screen.getByLabelText("E-mail"), "ana@exemplo.com")
  await user.type(screen.getByLabelText("Senha"), senha)
  await user.click(screen.getByRole("button", { name: "Entrar" }))
}

beforeEach(() => {
  navegou.mockClear()
  clearAccessToken()
  fetchMock = vi.fn()
  vi.stubGlobal("fetch", fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("LoginPage", () => {
  it("valida no cliente antes de chamar a API", async () => {
    const user = userEvent.setup()
    renderizar()

    await user.click(screen.getByRole("button", { name: "Entrar" }))

    expect(await screen.findByText("Informe seu e-mail.")).toBeInTheDocument()
    expect(screen.getByText("Informe sua senha.")).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("credenciais válidas guardam o token e navegam", async () => {
    responde(
      {
        accessToken: "token-de-acesso",
        tokenType: "Bearer",
        expiresIn: 900,
        user: {
          id: "1",
          name: "Ana Souza",
          email: "ana@exemplo.com",
          createdAt: "2026-09-01T12:00:00.000Z",
        },
      },
      200,
    )
    renderizar()

    await preencher()

    await waitFor(() => expect(navegou).toHaveBeenCalled())
    expect(getAccessToken()).toBe("token-de-acesso")
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("mostra a mensagem do servidor para credencial errada, sem falar em sessão expirada", async () => {
    responde(
      {
        statusCode: 401,
        error: "Unauthorized",
        message: "E-mail ou senha incorretos.",
        path: "/api/auth/login",
        timestamp: "2026-09-21T12:00:00.000Z",
      },
      401,
    )
    renderizar()

    await preencher("SenhaErrada1")

    expect(
      await screen.findByText("E-mail ou senha incorretos."),
    ).toBeInTheDocument()
    expect(screen.queryByText(/sessão expirou/i)).not.toBeInTheDocument()
    expect(navegou).not.toHaveBeenCalled()
    expect(getAccessToken()).toBeNull()
    // O 401 do login não pode disparar renovação de sessão.
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it("informa o limite de tentativas", async () => {
    responde(
      {
        statusCode: 429,
        error: "ThrottlerException",
        message: "Muitas tentativas. Aguarde um instante e tente novamente.",
        path: "/api/auth/login",
        timestamp: "2026-09-21T12:00:00.000Z",
      },
      429,
    )
    renderizar()

    await preencher()

    expect(await screen.findByText(/Muitas tentativas/)).toBeInTheDocument()
  })
})
