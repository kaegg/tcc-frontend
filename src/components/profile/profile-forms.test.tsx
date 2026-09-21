import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ChangePasswordForm } from "@/components/profile/change-password-form"
import { ProfileDataForm } from "@/components/profile/profile-data-form"

vi.mock("@/hooks/use-session", () => ({
  useAuthenticatedUser: () => ({
    name: "Ana Souza",
    email: "ana@exemplo.com",
    initials: "AS",
  }),
}))

const PERFIL = {
  id: "0199a1b2-c3d4-7000-8000-00000000000a",
  name: "Ana Souza",
  email: "ana@exemplo.com",
  createdAt: "2026-09-01T12:00:00.000Z",
}

let fetchMock: ReturnType<typeof vi.fn>

type Rota = { status: number; body?: unknown }

/** Responde por método: o formulário faz GET ao abrir e PATCH/PUT ao enviar. */
function rotas(porMetodo: Partial<Record<string, Rota>>) {
  fetchMock.mockImplementation((_url: string, init?: RequestInit) => {
    const rota = porMetodo[init?.method ?? "GET"] ?? {
      status: 200,
      body: PERFIL,
    }

    return Promise.resolve(
      rota.status === 204
        ? new Response(null, { status: 204 })
        : new Response(JSON.stringify(rota.body), {
            status: rota.status,
            headers: { "Content-Type": "application/json" },
          }),
    )
  })
}

const erro = (statusCode: number, message: string, campo?: string) => ({
  statusCode,
  error: "Erro",
  message: [message],
  path: "/api/users/me",
  timestamp: "2026-09-21T12:00:00.000Z",
  ...(campo ? { fieldErrors: { [campo]: [message] } } : {}),
})

/** Corpo da chamada com o método dado. */
function corpoEnviado(metodo: string): Record<string, unknown> | undefined {
  const chamada = fetchMock.mock.calls.find(
    (c) => (c[1] as RequestInit | undefined)?.method === metodo,
  )

  return chamada
    ? (JSON.parse((chamada[1] as RequestInit).body as string) as Record<
        string,
        unknown
      >)
    : undefined
}

function renderizar(ui: ReactNode): void {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>)
}

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal("fetch", fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("ProfileDataForm", () => {
  it("exibe os dados persistidos, lidos do servidor", async () => {
    rotas({ GET: { status: 200, body: { ...PERFIL, name: "Ana Souza Lima" } } })
    renderizar(<ProfileDataForm />)

    await waitFor(() =>
      expect(screen.getByLabelText("Nome")).toHaveValue("Ana Souza Lima"),
    )
    expect(screen.getByLabelText("E-mail")).toHaveValue("ana@exemplo.com")
  })

  it("alterar só o nome não pede nem envia a senha", async () => {
    rotas({ PATCH: { status: 200, body: { ...PERFIL, name: "Ana Lima" } } })
    const user = userEvent.setup()
    renderizar(<ProfileDataForm />)

    await user.clear(screen.getByLabelText("Nome"))
    await user.type(screen.getByLabelText("Nome"), "Ana Lima")
    expect(screen.queryByLabelText("Senha atual")).not.toBeInTheDocument()
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }))

    await waitFor(() => expect(corpoEnviado("PATCH")).toBeDefined())
    expect(corpoEnviado("PATCH")).toEqual({
      name: "Ana Lima",
      email: "ana@exemplo.com",
    })
  })

  it("trocar o e-mail pede a senha atual e não chama a API sem ela", async () => {
    rotas({})
    const user = userEvent.setup()
    renderizar(<ProfileDataForm />)

    await user.clear(screen.getByLabelText("E-mail"))
    await user.type(screen.getByLabelText("E-mail"), "nova@exemplo.com")
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }))

    expect(
      await screen.findByText("Informe sua senha atual para alterar o e-mail."),
    ).toBeInTheDocument()
    expect(corpoEnviado("PATCH")).toBeUndefined()
  })

  it("envia a senha atual junto com o e-mail novo", async () => {
    rotas({
      PATCH: { status: 200, body: { ...PERFIL, email: "nova@exemplo.com" } },
    })
    const user = userEvent.setup()
    renderizar(<ProfileDataForm />)

    await user.clear(screen.getByLabelText("E-mail"))
    await user.type(screen.getByLabelText("E-mail"), "nova@exemplo.com")
    await user.type(screen.getByLabelText("Senha atual"), "SenhaValida123")
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }))

    await waitFor(() => expect(corpoEnviado("PATCH")).toBeDefined())
    expect(corpoEnviado("PATCH")).toEqual({
      name: "Ana Souza",
      email: "nova@exemplo.com",
      currentPassword: "SenhaValida123",
    })
  })

  it("marca no campo a senha atual incorreta", async () => {
    rotas({
      PATCH: {
        status: 400,
        body: erro(400, "Senha atual incorreta.", "currentPassword"),
      },
    })
    const user = userEvent.setup()
    renderizar(<ProfileDataForm />)

    await user.clear(screen.getByLabelText("E-mail"))
    await user.type(screen.getByLabelText("E-mail"), "nova@exemplo.com")
    await user.type(screen.getByLabelText("Senha atual"), "Errada12345")
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }))

    expect(
      await screen.findByText("Senha atual incorreta."),
    ).toBeInTheDocument()
  })

  it("marca no campo o e-mail já cadastrado", async () => {
    rotas({
      PATCH: {
        status: 409,
        body: erro(409, "Este e-mail já está cadastrado.", "email"),
      },
    })
    const user = userEvent.setup()
    renderizar(<ProfileDataForm />)

    await user.clear(screen.getByLabelText("E-mail"))
    await user.type(screen.getByLabelText("E-mail"), "bruno@exemplo.com")
    await user.type(screen.getByLabelText("Senha atual"), "SenhaValida123")
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }))

    expect(
      await screen.findByText("Este e-mail já está cadastrado."),
    ).toBeInTheDocument()
  })
})

describe("ChangePasswordForm", () => {
  async function preencher(atual: string, nova: string, confirmacao: string) {
    const user = userEvent.setup()

    await user.type(screen.getByLabelText("Senha atual"), atual)
    await user.type(screen.getByLabelText("Nova senha"), nova)
    await user.type(screen.getByLabelText("Confirmar nova senha"), confirmacao)
    await user.click(screen.getByRole("button", { name: "Alterar senha" }))
  }

  it("valida no cliente antes de chamar a API", async () => {
    rotas({})
    renderizar(<ChangePasswordForm />)

    await preencher("SenhaValida123", "curta", "outra")

    expect(
      await screen.findByText("A senha deve ter pelo menos 8 caracteres."),
    ).toBeInTheDocument()
    expect(screen.getByText("As senhas não coincidem.")).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("recusa nova senha igual à atual", async () => {
    rotas({})
    renderizar(<ChangePasswordForm />)

    await preencher("SenhaValida123", "SenhaValida123", "SenhaValida123")

    expect(
      await screen.findByText("A nova senha deve ser diferente da atual."),
    ).toBeInTheDocument()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("envia só as duas senhas e limpa os campos ao concluir", async () => {
    rotas({ PUT: { status: 204 } })
    renderizar(<ChangePasswordForm />)

    await preencher("SenhaValida123", "NovaSenha456", "NovaSenha456")

    await waitFor(() => expect(corpoEnviado("PUT")).toBeDefined())
    // A confirmação não vai no corpo: o backend recusa campo fora do contrato.
    expect(corpoEnviado("PUT")).toEqual({
      currentPassword: "SenhaValida123",
      newPassword: "NovaSenha456",
    })
    await waitFor(() =>
      expect(screen.getByLabelText("Senha atual")).toHaveValue(""),
    )
    expect(screen.getByLabelText("Nova senha")).toHaveValue("")
  })

  it("marca a senha atual incorreta e apaga o que foi digitado", async () => {
    rotas({
      PUT: {
        status: 400,
        body: erro(400, "Senha atual incorreta.", "currentPassword"),
      },
    })
    renderizar(<ChangePasswordForm />)

    await preencher("Errada12345", "NovaSenha456", "NovaSenha456")

    expect(
      await screen.findByText("Senha atual incorreta."),
    ).toBeInTheDocument()
    expect(screen.getByLabelText("Nova senha")).toHaveValue("")
  })
})
