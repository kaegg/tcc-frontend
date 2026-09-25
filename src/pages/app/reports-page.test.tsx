import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ReportsPage } from "@/pages/app/reports-page"

const resumo = (extra: Record<string, unknown> = {}) => ({
  from: "2026-09-01",
  to: "2026-09-30",
  income: "1750.10",
  expense: "1236.20",
  balance: "513.90",
  transactionCount: 6,
  ...extra,
})

let fetchMock: ReturnType<typeof vi.fn>

type Resposta = { status: number; body: unknown }

function rotas(tabela: (url: URL) => Resposta) {
  fetchMock.mockImplementation((url: string) => {
    const { status, body } = tabela(new URL(url))
    return Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
    )
  })
}

/** Ecoa o período pedido, para a tela mostrar o que o servidor respondeu. */
function ecoa(extra: Record<string, unknown> = {}) {
  rotas((url) => ({
    status: 200,
    body: resumo({
      from: url.searchParams.get("from"),
      to: url.searchParams.get("to"),
      ...extra,
    }),
  }))
}

const consultas = () =>
  fetchMock.mock.calls
    .map((c) => new URL(String(c[0])))
    .filter((url) => url.pathname === "/api/reports/summary")

const ultimoPeriodo = () => {
  const url = consultas().at(-1)!
  return { from: url.searchParams.get("from"), to: url.searchParams.get("to") }
}

function renderizar(url = "/relatorios"): void {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[url]}>
        <ReportsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  // Só o relógio é falso; os timers reais mantêm o userEvent funcionando.
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(new Date(2026, 8, 25, 12))
  fetchMock = vi.fn()
  vi.stubGlobal("fetch", fetchMock)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe("ReportsPage", () => {
  it("abre no mês atual e mostra receitas, despesas, saldo e quantidade", async () => {
    ecoa()
    renderizar()

    expect(await screen.findByText("R$ 1.750,10")).toBeInTheDocument()
    expect(screen.getByText("R$ 1.236,20")).toBeInTheDocument()
    expect(screen.getByText("R$ 513,90")).toBeInTheDocument()
    expect(screen.getByText("6")).toBeInTheDocument()
    expect(screen.getByText("De 01/09/2026 a 30/09/2026")).toBeInTheDocument()
    expect(ultimoPeriodo()).toEqual({ from: "2026-09-01", to: "2026-09-30" })
    expect(screen.getByRole("combobox", { name: "Período" })).toHaveTextContent(
      "Este mês",
    )
  })

  it("mostra o saldo negativo como negativo", async () => {
    ecoa({ income: "100.00", expense: "150.55", balance: "-50.55" })
    renderizar()

    // Intl usa espaço não separável entre "R$" e o número.
    const saldo = await screen.findByText(/^-\s?R\$\s50,55$/)
    expect(saldo).toHaveClass("text-destructive")
  })

  it("período sem lançamentos mostra zeros e avisa", async () => {
    ecoa({
      income: "0.00",
      expense: "0.00",
      balance: "0.00",
      transactionCount: 0,
    })
    renderizar()

    expect(
      await screen.findByText("Nenhum lançamento neste período."),
    ).toBeInTheDocument()
    expect(screen.getAllByText("R$ 0,00")).toHaveLength(3)
  })

  it("trocar o período predefinido consulta o novo intervalo", async () => {
    ecoa()
    const user = userEvent.setup()
    renderizar()

    await screen.findByText("R$ 1.750,10")
    await user.click(screen.getByRole("combobox", { name: "Período" }))
    await user.click(
      await screen.findByRole("option", { name: "Mês anterior" }),
    )

    await waitFor(() =>
      expect(ultimoPeriodo()).toEqual({ from: "2026-08-01", to: "2026-08-31" }),
    )
    expect(
      await screen.findByText("De 01/08/2026 a 31/08/2026"),
    ).toBeInTheDocument()
  })

  it("editar uma data vira período personalizado", async () => {
    ecoa()
    renderizar()

    await screen.findByText("R$ 1.750,10")
    fireEvent.change(screen.getByLabelText("De"), {
      target: { value: "2026-09-10" },
    })

    await waitFor(() =>
      expect(ultimoPeriodo()).toEqual({ from: "2026-09-10", to: "2026-09-30" }),
    )
    expect(screen.getByRole("combobox", { name: "Período" })).toHaveTextContent(
      "Personalizado",
    )
  })

  it("período invertido é avisado e não vai ao servidor", async () => {
    ecoa()
    renderizar()

    await screen.findByText("R$ 1.750,10")
    const antes = consultas().length
    fireEvent.change(screen.getByLabelText("Até"), {
      target: { value: "2026-08-15" },
    })

    expect(
      await screen.findByText(
        "A data final deve ser igual ou posterior à inicial.",
      ),
    ).toBeInTheDocument()
    expect(screen.getByLabelText("Até")).toHaveAttribute("aria-invalid", "true")
    expect(consultas()).toHaveLength(antes)
  })

  it("período da URL é respeitado, e o inválido cai no mês atual", async () => {
    ecoa()
    renderizar("/relatorios?from=2026-01-01&to=2026-03-31")

    await screen.findByText("De 01/01/2026 a 31/03/2026")
    expect(ultimoPeriodo()).toEqual({ from: "2026-01-01", to: "2026-03-31" })
  })

  it("link editado à mão não manda lixo ao servidor", async () => {
    ecoa()
    renderizar("/relatorios?from=ontem&to=2026-03-31&userId=outro")

    await screen.findByText("R$ 1.750,10")
    const enviados = [...consultas()[0].searchParams.keys()].sort()
    expect(enviados).toEqual(["from", "to"])
    expect(ultimoPeriodo()).toEqual({ from: "2026-09-01", to: "2026-09-30" })
  })

  it("leva à listagem filtrada pelo mesmo período", async () => {
    ecoa()
    renderizar()

    const link = await screen.findByRole("link", {
      name: /Ver lançamentos do período/,
    })
    expect(link).toHaveAttribute(
      "href",
      "/lancamentos?from=2026-09-01&to=2026-09-30",
    )
  })

  it("falha do servidor mostra o erro com nova tentativa", async () => {
    rotas(() => ({
      status: 500,
      body: {
        statusCode: 500,
        error: "Internal Server Error",
        message: "Erro interno no servidor. Tente novamente em instantes.",
        path: "/api/reports/summary",
        timestamp: "2026-09-25T12:00:00.000Z",
      },
    }))
    const user = userEvent.setup()
    renderizar()

    expect(
      await screen.findByText("Não foi possível carregar o relatório"),
    ).toBeInTheDocument()

    ecoa()
    await user.click(screen.getByRole("button", { name: "Tentar novamente" }))

    expect(await screen.findByText("R$ 1.750,10")).toBeInTheDocument()
  })

  it("resposta fora do contrato não vira número na tela", async () => {
    rotas(() => ({ status: 200, body: resumo({ balance: 513.9 }) }))
    renderizar()

    expect(
      await screen.findByText("Não foi possível carregar o relatório"),
    ).toBeInTheDocument()
    expect(screen.queryByText(/513/)).not.toBeInTheDocument()
  })
})
