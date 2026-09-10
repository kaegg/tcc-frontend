import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import type { ReactNode } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ApiStatusBanner } from "@/components/app/api-status-banner"

const saudavel = {
  status: "ok",
  timestamp: "2026-09-02T21:57:03.482Z",
  uptimeSeconds: 15,
  dependencies: { database: { status: "ok", latencyMs: 3 } },
}

const degradado = {
  status: "degradado",
  timestamp: "2026-09-02T21:57:03.482Z",
  uptimeSeconds: 8,
  dependencies: { database: { status: "indisponivel" } },
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

function renderizar(): void {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )

  render(<ApiStatusBanner />, { wrapper })
}

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal("fetch", fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("ApiStatusBanner", () => {
  it("não renderiza aviso quando a API está saudável", async () => {
    responde(saudavel)

    renderizar()

    // A regiao aria-live fica sempre montada; o que muda e o conteudo dela.
    expect(await screen.findByRole("status")).toBeInTheDocument()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("avisa que o serviço está parcialmente indisponível no 503", async () => {
    responde(degradado, 503)

    renderizar()

    expect(
      await screen.findByText(/Serviço parcialmente indisponível/i),
    ).toBeInTheDocument()
  })

  it("avisa que não há conexão quando a requisição falha", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"))

    renderizar()

    expect(
      await screen.findByText(/Sem conexão com o servidor/i),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: /Tentar novamente/i }),
    ).toBeInTheDocument()
  })
})
