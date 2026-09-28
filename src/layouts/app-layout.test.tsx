import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { AppLayout } from "@/layouts/app-layout"
import { signOut } from "@/lib/api/auth-session"

vi.mock("@/hooks/use-session", () => ({
  useAuthenticatedUser: () => ({
    id: "0199a1b2-c3d4-7000-8000-0000000000aa",
    name: "Ana Souza",
    email: "ana@exemplo.com",
    initials: "AS",
  }),
}))

vi.mock("@/lib/api/auth-session", () => ({
  signOut: vi.fn(() => Promise.resolve(true)),
}))

function renderizar() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/dashboard"]}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/dashboard" element={<p>Tela do dashboard</p>} />
            <Route path="/perfil" element={<p>Tela do perfil</p>} />
          </Route>
          <Route path="/login" element={<p>Tela de login</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  // O menu lateral consulta a largura da tela; o jsdom não tem matchMedia. O
  // banner de status da API faz a consulta de saúde.
  vi.stubGlobal(
    "matchMedia",
    (query: string) =>
      ({
        matches: false,
        media: query,
        addEventListener() {},
        removeEventListener() {},
      }) as unknown as MediaQueryList,
  )
  vi.stubGlobal(
    "fetch",
    vi.fn(() => new Promise(() => {})),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.mocked(signOut).mockClear()
})

describe("AppLayout", () => {
  it("o ícone da conta leva direto ao perfil", async () => {
    const user = userEvent.setup()
    renderizar()

    await user.click(screen.getByRole("link", { name: "Perfil: Ana Souza" }))

    expect(await screen.findByText("Tela do perfil")).toBeInTheDocument()
  })

  it("sair revoga a sessão no servidor antes de ir ao login", async () => {
    const user = userEvent.setup()
    renderizar()

    await user.click(screen.getByRole("button", { name: "Sair" }))

    expect(await screen.findByText("Tela de login")).toBeInTheDocument()
    expect(signOut).toHaveBeenCalledTimes(1)
  })
})
