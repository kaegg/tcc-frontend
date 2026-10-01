import { render, screen } from "@testing-library/react"
import {
  MemoryRouter,
  Route,
  Routes,
  type InitialEntry,
} from "react-router-dom"
import { beforeEach, describe, expect, it, vi } from "vitest"

import { useSession } from "@/hooks/use-session"
import { restoreSession } from "@/lib/api/auth-session"
import { GuestRoute } from "@/routes/guest-route"

vi.mock("@/hooks/use-session", () => ({ useSession: vi.fn() }))
vi.mock("@/lib/api/auth-session", () => ({
  restoreSession: vi.fn(() => Promise.resolve(false)),
}))

function sessao(estado: { isAuthenticated: boolean; isLoading: boolean }) {
  vi.mocked(useSession).mockReturnValue({ ...estado, user: null })
}

function renderizar(entrada: InitialEntry) {
  render(
    <MemoryRouter initialEntries={[entrada]}>
      <Routes>
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<p>Tela de login</p>} />
          <Route path="/cadastro" element={<p>Tela de cadastro</p>} />
        </Route>
        <Route path="/dashboard" element={<p>Tela do dashboard</p>} />
        <Route path="/relatorios" element={<p>Tela de relatórios</p>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.mocked(restoreSession).mockClear()
})

describe("GuestRoute", () => {
  it.each(["/login", "/cadastro"])(
    "com sessão ativa, %s leva ao dashboard",
    (rota) => {
      sessao({ isAuthenticated: true, isLoading: false })
      renderizar(rota)

      expect(screen.getByText("Tela do dashboard")).toBeInTheDocument()
    },
  )

  it("com sessão ativa, volta à rota privada que o usuário tentou abrir", () => {
    sessao({ isAuthenticated: true, isLoading: false })
    renderizar({
      pathname: "/login",
      state: { from: { pathname: "/relatorios", search: "" } },
    })

    expect(screen.getByText("Tela de relatórios")).toBeInTheDocument()
  })

  it("não segue destino para outro domínio guardado no estado", () => {
    sessao({ isAuthenticated: true, isLoading: false })
    renderizar({
      pathname: "/login",
      state: { from: { pathname: "//site-malicioso.com" } },
    })

    expect(screen.getByText("Tela do dashboard")).toBeInTheDocument()
  })

  it.each([
    ["/login", "Tela de login"],
    ["/cadastro", "Tela de cadastro"],
  ])("sem sessão, %s abre normalmente", (rota, tela) => {
    sessao({ isAuthenticated: false, isLoading: false })
    renderizar(rota)

    expect(screen.getByText(tela)).toBeInTheDocument()
  })

  it("enquanto confere o cookie, não mostra o formulário nem redireciona", () => {
    sessao({ isAuthenticated: false, isLoading: true })
    renderizar("/login")

    expect(screen.getByRole("status")).toHaveTextContent(
      "Verificando sua sessão...",
    )
    expect(screen.queryByText("Tela de login")).not.toBeInTheDocument()
  })

  it("tenta restaurar a sessão pelo cookie ao abrir", () => {
    sessao({ isAuthenticated: false, isLoading: true })
    renderizar("/login")

    expect(restoreSession).toHaveBeenCalledTimes(1)
  })
})
