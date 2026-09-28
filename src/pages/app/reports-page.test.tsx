import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { ReportsPage } from "@/pages/app/reports-page"

const ALIMENTACAO = "0199a1b2-c3d4-7000-8000-00000000c001"
const MORADIA = "0199a1b2-c3d4-7000-8000-00000000c003"
const SALARIO = "0199a1b2-c3d4-7000-8000-00000000c101"

const mes = (
  month: string,
  income: string,
  expense: string,
  balance: string,
  transactionCount: number,
  from = `${month}-01`,
  to = `${month}-30`,
) => ({ month, from, to, income, expense, balance, transactionCount })

/** Mesmo conjunto do teste e2e do backend: 15/08 a 10/10 de 2026. */
function visao(extra: Record<string, unknown> = {}) {
  return {
    from: "2026-08-15",
    to: "2026-10-10",
    income: "4000.00",
    expense: "1280.55",
    balance: "2719.45",
    savingsRate: "67.99",
    transactionCount: 7,
    incomeByCategory: [
      {
        categoryId: SALARIO,
        categoryName: "Salário",
        total: "4000.00",
        transactionCount: 2,
        share: "100.00",
      },
    ],
    expenseByCategory: [
      {
        categoryId: MORADIA,
        categoryName: "Moradia",
        total: "1200.00",
        transactionCount: 1,
        share: "93.71",
      },
      {
        categoryId: ALIMENTACAO,
        categoryName: "Alimentação",
        total: "80.55",
        transactionCount: 4,
        share: "6.29",
      },
    ],
    months: [
      mes(
        "2026-08",
        "1000.00",
        "50.25",
        "949.75",
        2,
        "2026-08-15",
        "2026-08-31",
      ),
      mes("2026-09", "3000.00", "1200.30", "1799.70", 4),
      mes("2026-10", "0.00", "30.00", "-30.00", 1, "2026-10-01", "2026-10-10"),
    ],
    ...extra,
  }
}

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
    body: visao({
      from: url.searchParams.get("from"),
      to: url.searchParams.get("to"),
      ...extra,
    }),
  }))
}

const consultas = () =>
  fetchMock.mock.calls
    .map((c) => new URL(String(c[0])))
    .filter((url) => url.pathname.startsWith("/api/reports/"))

const ultimoPeriodo = () => {
  const url = consultas().at(-1)!
  return { from: url.searchParams.get("from"), to: url.searchParams.get("to") }
}

/** Valor mostrado num cartão de indicador, achado pelo rótulo. */
function cartao(rotulo: string): string {
  const grupo = screen.getByRole("group", { name: "Indicadores do período" })
  const card = within(grupo)
    .getByText(rotulo)
    .closest("[data-slot=card]") as HTMLElement
  return espacos(card.querySelector(".financial-figure")?.textContent ?? "")
}

/** O Intl separa "R$" do número com espaço não separável. */
const espacos = (texto: string) => texto.replace(/\s/g, " ")

/** Texto esperado com o espaço não separável que o Intl põe depois de "R$". */
const comNbsp = (texto: string) => texto.replace(/R\$ /g, "R$ ")

const tabela = () =>
  screen.getByRole("table", { name: /Receitas, despesas, saldo/ })

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
  // O jsdom não tem matchMedia (redução de movimento) nem ResizeObserver
  // (ResponsiveContainer do Recharts).
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
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  )
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe("ReportsPage", () => {
  describe("período", () => {
    it("abre no mês atual, numa única consulta à visão geral", async () => {
      ecoa()
      renderizar()

      await screen.findByText("De 01/09/2026 a 30/09/2026")
      expect(consultas()).toHaveLength(1)
      expect(consultas()[0].pathname).toBe("/api/reports/overview")
      expect(ultimoPeriodo()).toEqual({ from: "2026-09-01", to: "2026-09-30" })
      expect(
        screen.getByRole("combobox", { name: "Período" }),
      ).toHaveTextContent("Este mês")
    })

    it("trocar o período predefinido consulta o novo intervalo", async () => {
      ecoa()
      const user = userEvent.setup()
      renderizar()

      await screen.findByText("De 01/09/2026 a 30/09/2026")
      await user.click(screen.getByRole("combobox", { name: "Período" }))
      await user.click(
        await screen.findByRole("option", { name: "Últimos 3 meses" }),
      )

      await waitFor(() =>
        expect(ultimoPeriodo()).toEqual({
          from: "2026-07-01",
          to: "2026-09-30",
        }),
      )
      expect(
        await screen.findByText("De 01/07/2026 a 30/09/2026"),
      ).toBeInTheDocument()
    })

    it("editar uma data vira período personalizado", async () => {
      ecoa()
      renderizar()

      await screen.findByText("De 01/09/2026 a 30/09/2026")
      fireEvent.change(screen.getByLabelText("De"), {
        target: { value: "2026-09-10" },
      })

      await waitFor(() =>
        expect(ultimoPeriodo()).toEqual({
          from: "2026-09-10",
          to: "2026-09-30",
        }),
      )
      expect(
        screen.getByRole("combobox", { name: "Período" }),
      ).toHaveTextContent("Personalizado")
    })

    it.each([
      ["2026-08-15", "A data final deve ser igual ou posterior à inicial."],
      ["2028-09-30", "O período deve ter no máximo 24 meses."],
    ])(
      "fim em %s é avisado no campo e não vai ao servidor",
      async (to, mensagem) => {
        ecoa()
        renderizar()

        await screen.findByText("De 01/09/2026 a 30/09/2026")
        const antes = consultas().length
        fireEvent.change(screen.getByLabelText("Até"), {
          target: { value: to },
        })

        expect(await screen.findByText(mensagem)).toBeInTheDocument()
        expect(screen.getByLabelText("Até")).toHaveAttribute(
          "aria-invalid",
          "true",
        )
        expect(consultas()).toHaveLength(antes)
      },
    )

    it("link editado à mão não manda lixo ao servidor", async () => {
      ecoa()
      renderizar("/relatorios?from=ontem&to=2026-03-31&userId=outro")

      await screen.findByText("De 01/09/2026 a 30/09/2026")
      const enviados = [...consultas()[0].searchParams.keys()].sort()
      expect(enviados).toEqual(["from", "to"])
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
  })

  describe("cartões", () => {
    it("mostram receitas, despesas, saldo e economia do backend", async () => {
      ecoa()
      renderizar()

      await screen.findByText("De 01/09/2026 a 30/09/2026")
      expect(cartao("Receitas totais")).toMatch(/4\.000,00/)
      expect(cartao("Despesas totais")).toMatch(/1\.280,55/)
      expect(cartao("Saldo")).toMatch(/2\.719,45/)
      expect(cartao("Economia")).toBe("67,99%")
      expect(screen.getByText("7 lançamentos")).toBeInTheDocument()
    })

    it("sem receita, a economia diz isso em vez de mostrar 0%", async () => {
      ecoa({ income: "0.00", savingsRate: null })
      renderizar()

      await screen.findByText("De 01/09/2026 a 30/09/2026")
      expect(cartao("Economia")).toBe("Sem receitas")
    })

    it("resposta fora do contrato não vira número na tela", async () => {
      rotas(() => ({ status: 200, body: visao({ balance: 2719.45 }) }))
      renderizar()

      expect(
        await screen.findByText("Não foi possível carregar o relatório"),
      ).toBeInTheDocument()
      expect(screen.queryByText(/2\.719/)).not.toBeInTheDocument()
    })
  })

  describe("tabela e gráficos representam os mesmos dados", () => {
    it("a tabela traz os meses da resposta e o total dos cartões", async () => {
      ecoa()
      renderizar()

      await screen.findByText("De 01/09/2026 a 30/09/2026")
      const linhas = within(tabela()).getAllByRole("row")
      const texto = linhas.map((l) =>
        [...l.querySelectorAll("th, td")].map((c) =>
          espacos(c.textContent ?? ""),
        ),
      )

      expect(texto[1][0]).toMatch(/agosto de 2026.*15\/08\/2026 a 31\/08\/2026/)
      expect(texto[1].slice(1)).toEqual([
        "R$ 1.000,00",
        "R$ 50,25",
        "R$ 949,75",
        "2",
      ])
      expect(texto[2][0]).toBe("setembro de 2026")
      expect(texto[3].slice(1)).toEqual([
        "R$ 0,00",
        "R$ 30,00",
        "-R$ 30,00",
        "1",
      ])
      expect(texto.at(-1)).toEqual([
        "Total",
        "R$ 4.000,00",
        "R$ 1.280,55",
        "R$ 2.719,45",
        "7",
      ])
      expect(cartao("Receitas totais")).toBe(texto.at(-1)![1])
      expect(cartao("Despesas totais")).toBe(texto.at(-1)![2])
    })

    it("os gráficos têm nome, ficam fora da leitura de tela e trazem descrição textual", async () => {
      ecoa()
      renderizar()

      const fluxo = await screen.findByRole("figure", {
        name: "Receitas x Despesas",
      })
      expect(fluxo).toHaveAccessibleDescription(
        comNbsp(
          "Em 3 meses, receitas somam R$ 4.000,00 e despesas R$ 1.280,55. " +
            "Maior receita em setembro de 2026 (R$ 3.000,00). " +
            "Maior despesa em setembro de 2026 (R$ 1.200,30).",
        ),
      )
      expect(
        fluxo.querySelector("[data-slot=chart]")?.closest("[aria-hidden]"),
      ).not.toBeNull()

      const saldo = screen.getByRole("figure", { name: "Evolução do saldo" })
      expect(saldo).toHaveAccessibleDescription(
        comNbsp(
          "Saldo positivo em 2 de 3 meses. " +
            "Melhor mês: setembro de 2026 (R$ 1.799,70). " +
            "Pior mês: outubro de 2026 (-R$ 30,00).",
        ),
      )
    })

    it("nenhum elemento focável fica escondido da leitura de tela", async () => {
      ecoa()
      renderizar()

      await screen.findByRole("figure", { name: "Receitas x Despesas" })
      const escondidos = document.querySelectorAll("[aria-hidden=true]")
      for (const bloco of escondidos) {
        expect(
          bloco.querySelector("[tabindex]:not([tabindex='-1'])"),
        ).toBeNull()
      }
    })

    it("a distribuição alterna entre despesas e receitas", async () => {
      ecoa()
      const user = userEvent.setup()
      renderizar()

      const titulo = await screen.findByText("Distribuição por categoria")
      const card = titulo.closest("[data-slot=card]") as HTMLElement
      expect(within(card).getByText("Moradia")).toBeInTheDocument()
      expect(within(card).getByText("93,71%")).toBeInTheDocument()

      await user.click(within(card).getByRole("tab", { name: "Receitas" }))

      expect(within(card).getByText("Salário")).toBeInTheDocument()
      expect(within(card).queryByText("Moradia")).not.toBeInTheDocument()
    })

    it("trocar o período atualiza cartões, gráfico e tabela juntos", async () => {
      rotas((url) => {
        const setembro = url.searchParams.get("from") === "2026-09-01"
        return {
          status: 200,
          body: setembro
            ? visao({ from: "2026-09-01", to: "2026-09-30" })
            : visao({
                from: "2026-08-01",
                to: "2026-08-31",
                income: "1000.00",
                expense: "50.25",
                balance: "949.75",
                savingsRate: "94.98",
                transactionCount: 2,
                months: [
                  mes(
                    "2026-08",
                    "1000.00",
                    "50.25",
                    "949.75",
                    2,
                    "2026-08-01",
                    "2026-08-31",
                  ),
                ],
              }),
        }
      })
      const user = userEvent.setup()
      renderizar()

      await screen.findByText("De 01/09/2026 a 30/09/2026")
      await user.click(screen.getByRole("combobox", { name: "Período" }))
      await user.click(
        await screen.findByRole("option", { name: "Mês anterior" }),
      )

      await screen.findByText("De 01/08/2026 a 31/08/2026")
      expect(cartao("Receitas totais")).toMatch(/1\.000,00/)
      expect(cartao("Economia")).toBe("94,98%")
      expect(within(tabela()).getAllByRole("row")).toHaveLength(3)
      expect(
        screen.getByRole("figure", { name: "Receitas x Despesas" }),
      ).toHaveAccessibleDescription(
        comNbsp("Em 1 mês, receitas somam R$ 1.000,00 e despesas R$ 50,25."),
      )
    })
  })

  it("falha do servidor mostra o erro com nova tentativa", async () => {
    rotas(() => ({
      status: 500,
      body: {
        statusCode: 500,
        error: "Internal Server Error",
        message: "Erro interno no servidor. Tente novamente em instantes.",
        path: "/api/reports/overview",
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

    expect(
      await screen.findByText("De 01/09/2026 a 30/09/2026"),
    ).toBeInTheDocument()
  })

  it("período sem lançamentos avisa e descreve os gráficos como vazios", async () => {
    ecoa({
      income: "0.00",
      expense: "0.00",
      balance: "0.00",
      savingsRate: null,
      transactionCount: 0,
      incomeByCategory: [],
      expenseByCategory: [],
      months: [mes("2026-09", "0.00", "0.00", "0.00", 0)],
    })
    renderizar()

    expect(
      await screen.findByText("Nenhum lançamento neste período."),
    ).toBeInTheDocument()
    expect(screen.getByText("Nenhuma despesa no período.")).toBeInTheDocument()
    expect(
      screen.getByRole("figure", { name: "Receitas x Despesas" }),
    ).toHaveAccessibleDescription(comNbsp("Nenhum lançamento no período."))
  })
})
