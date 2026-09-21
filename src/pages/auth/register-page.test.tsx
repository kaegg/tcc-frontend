import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { RegisterPage } from "@/pages/auth/register-page"

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

function corpoDeErro(
  statusCode: number,
  message: string | string[],
  fieldErrors?: Record<string, string[]>,
) {
  return {
    statusCode,
    error: "Erro",
    message,
    path: "/api/users",
    timestamp: "2026-09-10T12:00:00.000Z",
    ...(fieldErrors ? { fieldErrors } : {}),
  }
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

  render(<RegisterPage />, { wrapper })
}

/** Preenche o formulário com dados que passam na validação do cliente. */
async function preencher(): Promise<void> {
  const user = userEvent.setup()

  await user.type(screen.getByLabelText("Nome"), "Kauan Eguchi")
  await user.type(screen.getByLabelText("E-mail"), "kauan@exemplo.com")
  await user.type(screen.getByLabelText("Senha"), "SenhaValida123")
  await user.type(screen.getByLabelText("Confirmar senha"), "SenhaValida123")
  await user.click(screen.getByRole("button", { name: "Criar conta" }))
}

beforeEach(() => {
  navegou.mockClear()
  fetchMock = vi.fn()
  vi.stubGlobal("fetch", fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("RegisterPage", () => {
  it("valida no cliente antes de chamar a API", async () => {
    const user = userEvent.setup()
    renderizar()

    await user.click(screen.getByRole("button", { name: "Criar conta" }))

    expect(
      await screen.findByText("O nome deve ter pelo menos 3 caracteres."),
    ).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("envia o cadastro e leva para o login", async () => {
    responde(
      {
        id: "0199a1b2-c3d4-7000-8000-000000000001",
        name: "Kauan Eguchi",
        email: "kauan@exemplo.com",
        createdAt: "2026-09-10T12:00:00.000Z",
      },
      201,
    )
    renderizar()

    await preencher()

    await waitFor(() => {
      expect(navegou).toHaveBeenCalledWith("/login", { replace: true })
    })
  })

  it("marca o e-mail duplicado no próprio campo", async () => {
    responde(
      corpoDeErro(409, "Este e-mail já está cadastrado.", {
        email: ["Este e-mail já está cadastrado."],
      }),
      409,
    )
    renderizar()

    await preencher()

    expect(
      await screen.findByText("Este e-mail já está cadastrado."),
    ).toBeInTheDocument()
    expect(screen.getByLabelText("E-mail")).toHaveAttribute(
      "aria-invalid",
      "true",
    )
    // Falha atribuída a um campo não vira aviso solto no topo.
    expect(screen.queryByRole("alert", { name: /criar a conta/i })).toBeNull()
    expect(navegou).not.toHaveBeenCalled()
  })

  it("mostra aviso no topo quando a falha não é de nenhum campo", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"))
    renderizar()

    await preencher()

    expect(
      await screen.findByText("Não foi possível criar a conta"),
    ).toBeInTheDocument()
    expect(navegou).not.toHaveBeenCalled()
  })
})
