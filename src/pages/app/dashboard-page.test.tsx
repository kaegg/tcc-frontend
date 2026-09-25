import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { DashboardPage } from "@/pages/app/dashboard-page"

const ALIMENTACAO = "0199a1b2-c3d4-7000-8000-00000000c001"
const MORADIA = "0199a1b2-c3d4-7000-8000-00000000c003"
const SALARIO = "0199a1b2-c3d4-7000-8000-00000000c101"

function resumo(month: string, extra: Record<string, unknown> = {}) {
  return {
    month,
    from: `${month}-01`,
    to: `${month}-30`,
    income: "3000.00",
    expense: "1300.30",
    balance: "1699.70",
    transactionCount: 6,
    incomeByCategory: [
      {
        categoryId: SALARIO,
        categoryName: "Salário",
        total: "3000.00",
        transactionCount: 1,
        share: "100.00",
      },
    ],
    expenseByCategory: [
      {
        categoryId: MORADIA,
        categoryName: "Moradia",
        total: "1200.00",
        transactionCount: 1,
        share: "92.29",
      },
      {
        categoryId: ALIMENTACAO,
        categoryName: "Alimentação",
        total: "100.30",
        transactionCount: 4,
        share: "7.71",
      },
    ],
    ...extra,
  }
}

const lancamento = (id: string, description: string) => ({
  id,
  type: "despesa",
  amount: "35.90",
  date: "2026-09-02",
  description,
  categoryId: ALIMENTACAO,
  categoryName: "Alimentação",
  source: "formulario",
  createdAt: "2026-09-02T12:00:00.000Z",
  updatedAt: "2026-09-02T12:00:00.000Z",
})

let fetchMock: ReturnType<typeof vi.fn>

type Resposta = { status: number; body: unknown }

/** Responde o resumo do mês pedido e a primeira página da listagem. */
function rotas(
  resumoDe: (month: string) => Resposta = (m) => ({
    status: 200,
    body: resumo(m),
  }),
) {
  fetchMock.mockImplementation((url: string) => {
    const alvo = new URL(url)
    const { status, body } =
      alvo.pathname === "/api/reports/monthly"
        ? resumoDe(alvo.searchParams.get("month") ?? "")
        : {
            status: 200,
            body: {
              data: [
                lancamento(
                  "0199a1b2-c3d4-7000-8000-0000000000f1",
                  "Almoço no campus",
                ),
              ],
              meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
            },
          }
    return Promise.resolve(
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
    )
  })
}

const chamadas = (pathname: string) =>
  fetchMock.mock.calls
    .map((c) => new URL(String(c[0])))
    .filter((url) => url.pathname === pathname)

const mesPedido = () =>
  chamadas("/api/reports/monthly").at(-1)?.searchParams.get("month")

function renderizar(url = "/dashboard"): void {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[url]}>
        <DashboardPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(new Date(2026, 8, 25, 12))
  fetchMock = vi.fn()
  vi.stubGlobal("fetch", fetchMock)
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe("DashboardPage", () => {
  it("abre no mês atual com os totais do backend", async () => {
    rotas()
    renderizar()

    expect(await screen.findByText("R$ 1.699,70")).toBeInTheDocument()
    expect(screen.getAllByText("R$ 3.000,00").length).toBeGreaterThan(0)
    expect(screen.getAllByText("R$ 1.300,30").length).toBeGreaterThan(0)
    expect(
      screen.getByText("Sua situação financeira de setembro de 2026."),
    ).toBeInTheDocument()
    expect(mesPedido()).toBe("2026-09")
  })

  it("mostra a distribuição por categoria com valor, percentual e quantidade", async () => {
    rotas()
    renderizar()

    const despesas = (
      await screen.findByText("Despesas por categoria")
    ).closest("[data-slot=card]") as HTMLElement
    const itens = within(despesas).getAllByRole("listitem")
    expect(itens.map((i) => i.textContent)).toEqual([
      expect.stringMatching(/Moradia.*1 lançamento.*1\.200,00.*92,29%/),
      expect.stringMatching(/Alimentação.*4 lançamentos.*100,30.*7,71%/),
    ])
    expect(
      within(despesas).getByText(/Total de R\$\s1\.300,30/),
    ).toBeInTheDocument()

    const receitas = screen
      .getByText("Receitas por categoria")
      .closest("[data-slot=card]") as HTMLElement
    expect(within(receitas).getByText("Salário")).toBeInTheDocument()
    expect(within(receitas).getByText("100,00%")).toBeInTheDocument()
  })

  it("mês sem movimento mostra zeros e as distribuições vazias", async () => {
    rotas((m) => ({
      status: 200,
      body: resumo(m, {
        income: "0.00",
        expense: "0.00",
        balance: "0.00",
        transactionCount: 0,
        incomeByCategory: [],
        expenseByCategory: [],
      }),
    }))
    renderizar()

    expect(
      await screen.findByText("Nenhuma despesa neste mês."),
    ).toBeInTheDocument()
    expect(screen.getByText("Nenhuma receita neste mês.")).toBeInTheDocument()
  })

  it("as setas trocam o mês de referência", async () => {
    rotas()
    const user = userEvent.setup()
    renderizar()

    await screen.findByText("R$ 1.699,70")
    expect(
      screen.queryByRole("button", { name: "Mês atual" }),
    ).not.toBeInTheDocument()

    await user.click(
      screen.getByRole("button", { name: /Mês anterior \(agosto de 2026\)/ }),
    )

    await waitFor(() => expect(mesPedido()).toBe("2026-08"))
    expect(
      await screen.findByText("Sua situação financeira de agosto de 2026."),
    ).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Mês atual" }))
    await waitFor(() => expect(mesPedido()).toBe("2026-09"))
  })

  it("seleciona mês e ano diretamente", async () => {
    rotas()
    const user = userEvent.setup()
    renderizar()

    await screen.findByText("R$ 1.699,70")
    await user.click(screen.getByRole("combobox", { name: "Mês" }))
    await user.click(await screen.findByRole("option", { name: "Março" }))
    await waitFor(() => expect(mesPedido()).toBe("2026-03"))

    await user.click(screen.getByRole("combobox", { name: "Ano" }))
    await user.click(await screen.findByRole("option", { name: "2025" }))
    await waitFor(() => expect(mesPedido()).toBe("2025-03"))
  })

  it("as movimentações são do mesmo mês do resumo, e o link leva à lista filtrada", async () => {
    rotas()
    renderizar("/dashboard?month=2026-02")

    expect(await screen.findByText("Almoço no campus")).toBeInTheDocument()

    const lista = chamadas("/api/transactions").at(-1)!
    expect(lista.searchParams.get("from")).toBe("2026-02-01")
    expect(lista.searchParams.get("to")).toBe("2026-02-28")
    expect(
      screen.getByRole("link", { name: /Ver todos os lançamentos do mês/ }),
    ).toHaveAttribute("href", "/lancamentos?from=2026-02-01&to=2026-02-28")
  })

  it("mês inválido na URL cai no mês atual sem mandar lixo", async () => {
    rotas()
    renderizar("/dashboard?month=2026-13&userId=outro")

    await screen.findByText("R$ 1.699,70")
    const enviados = [
      ...chamadas("/api/reports/monthly")[0].searchParams.keys(),
    ]
    expect(enviados).toEqual(["month"])
    expect(mesPedido()).toBe("2026-09")
  })

  it("falha do servidor mostra o erro com nova tentativa", async () => {
    rotas(() => ({
      status: 500,
      body: {
        statusCode: 500,
        error: "Internal Server Error",
        message: "Erro interno no servidor. Tente novamente em instantes.",
        path: "/api/reports/monthly",
        timestamp: "2026-09-25T12:00:00.000Z",
      },
    }))
    const user = userEvent.setup()
    renderizar()

    expect(
      await screen.findByText("Não foi possível carregar o resumo do mês"),
    ).toBeInTheDocument()

    rotas()
    await user.click(screen.getByRole("button", { name: "Tentar novamente" }))
    expect(await screen.findByText("R$ 1.699,70")).toBeInTheDocument()
  })

  it("percentual fora do contrato não vira número na tela", async () => {
    rotas((m) => ({
      status: 200,
      body: resumo(m, {
        expenseByCategory: [
          {
            categoryId: MORADIA,
            categoryName: "Moradia",
            total: "1200.00",
            transactionCount: 1,
            share: 92.29,
          },
        ],
      }),
    }))
    renderizar()

    expect(
      await screen.findByText("Não foi possível carregar o resumo do mês"),
    ).toBeInTheDocument()
    expect(screen.queryByText("Moradia")).not.toBeInTheDocument()
  })
})
