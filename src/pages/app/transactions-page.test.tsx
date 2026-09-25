import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { TransactionsPage } from "@/pages/app/transactions-page"

const ID_1 = "0199a1b2-c3d4-7000-8000-0000000000f1"
const ID_2 = "0199a1b2-c3d4-7000-8000-0000000000f2"

function item(id: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    type: "despesa",
    amount: "35.90",
    date: "2026-08-31",
    description: "Almoço no campus",
    categoryId: "0199a1b2-c3d4-7000-8000-00000000c001",
    categoryName: "Alimentação",
    source: "formulario",
    createdAt: "2026-09-01T15:30:00.000Z",
    updatedAt: "2026-09-02T09:00:00.000Z",
    ...extra,
  }
}

const pagina = (
  data: unknown[],
  page = 1,
  totalPages = 1,
  total = data.length,
) => ({
  data,
  meta: { page, pageSize: 20, total, totalPages },
})

const erroApi = (statusCode: number, message: string) => ({
  statusCode,
  error: "Erro",
  message,
  path: "/api/transactions",
  timestamp: "2026-09-21T12:00:00.000Z",
})

let fetchMock: ReturnType<typeof vi.fn>

type Resposta = { status: number; body: unknown }

/** Roteia por caminho e consulta: a página faz a listagem e, ao abrir, o detalhe. */
function rotas(tabela: (url: URL, method: string) => Resposta) {
  fetchMock.mockImplementation((url: string, init?: RequestInit) => {
    const { status, body } = tabela(new URL(url), init?.method ?? "GET")

    return Promise.resolve(
      status === 204
        ? new Response(null, { status })
        : new Response(JSON.stringify(body), {
            status,
            headers: { "Content-Type": "application/json" },
          }),
    )
  })
}

const chamadasDe = (method: string) =>
  fetchMock.mock.calls.filter(
    (c) => ((c[1] as RequestInit | undefined)?.method ?? "GET") === method,
  )

function renderizar(): void {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <TransactionsPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

beforeEach(() => {
  fetchMock = vi.fn()
  vi.stubGlobal("fetch", fetchMock)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("TransactionsPage", () => {
  it("mostra o estado de carregamento enquanto a lista não chega", () => {
    fetchMock.mockImplementation(() => new Promise(() => {}))
    renderizar()

    expect(
      screen.getByRole("status", { name: "Carregando lançamentos" }),
    ).toBeInTheDocument()
  })

  it("lista valor, data, tipo e categoria de cada lançamento", async () => {
    rotas(() => ({
      status: 200,
      body: pagina([
        item(ID_1),
        item(ID_2, {
          type: "receita",
          amount: "1500.00",
          description: "Salário de agosto",
          categoryName: "Salário",
        }),
      ]),
    }))
    renderizar()

    const linha = (await screen.findByText("Almoço no campus")).closest("tr")!
    expect(within(linha).getByText("Despesa")).toBeInTheDocument()
    expect(within(linha).getByText("Alimentação")).toBeInTheDocument()
    expect(within(linha).getByText("31/08/2026")).toBeInTheDocument()
    expect(within(linha).getByText(/35,90/)).toBeInTheDocument()

    const receita = screen.getByText("Salário de agosto").closest("tr")!
    expect(within(receita).getByText("Receita")).toBeInTheDocument()
    expect(within(receita).getByText(/1\.500,00/)).toBeInTheDocument()
  })

  it("pede a primeira página com o tamanho definido", async () => {
    rotas(() => ({ status: 200, body: pagina([item(ID_1)]) }))
    renderizar()

    await screen.findByText("Almoço no campus")

    const url = new URL(String(fetchMock.mock.calls[0][0]))
    expect(url.pathname).toBe("/api/transactions")
    expect(url.searchParams.get("page")).toBe("1")
    expect(url.searchParams.get("pageSize")).toBe("20")
  })

  it("mostra o estado vazio quando o usuário não tem lançamentos", async () => {
    rotas(() => ({ status: 200, body: pagina([]) }))
    renderizar()

    expect(
      await screen.findByText("Nenhum lançamento ainda"),
    ).toBeInTheDocument()
    expect(
      screen.getAllByRole("link", { name: /Novo lançamento/ }),
    ).toHaveLength(2)
  })

  it("mostra o erro com opção de tentar de novo", async () => {
    rotas(() => ({ status: 500, body: erroApi(500, "Erro interno.") }))
    renderizar()

    expect(
      await screen.findByText("Não foi possível carregar os lançamentos"),
    ).toBeInTheDocument()

    rotas(() => ({ status: 200, body: pagina([item(ID_1)]) }))
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Tentar novamente" }))

    expect(await screen.findByText("Almoço no campus")).toBeInTheDocument()
  })

  it("navega entre páginas e informa o total", async () => {
    rotas((url) =>
      url.searchParams.get("page") === "2"
        ? {
            status: 200,
            body: pagina(
              [item(ID_2, { description: "Item da página dois" })],
              2,
              2,
              21,
            ),
          }
        : { status: 200, body: pagina([item(ID_1)], 1, 2, 21) },
    )
    const user = userEvent.setup()
    renderizar()

    expect(
      await screen.findByText(/Página 1 de 2 · 21 lançamentos/),
    ).toBeVisible()
    expect(screen.getByRole("button", { name: /Anterior/ })).toBeDisabled()

    await user.click(screen.getByRole("button", { name: /Próxima/ }))

    expect(await screen.findByText("Item da página dois")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: /Próxima/ })).toBeDisabled()
  })

  it("não oferece paginação quando cabe numa página só", async () => {
    rotas(() => ({ status: 200, body: pagina([item(ID_1)]) }))
    renderizar()

    await screen.findByText("Almoço no campus")

    expect(
      screen.queryByRole("navigation", { name: "Paginação dos lançamentos" }),
    ).not.toBeInTheDocument()
  })

  it("abre o detalhe lendo o lançamento do servidor, com todos os dados", async () => {
    rotas((url) =>
      url.pathname.endsWith(ID_1)
        ? {
            status: 200,
            body: item(ID_1, { description: "Descrição completa do registro" }),
          }
        : { status: 200, body: pagina([item(ID_1)]) },
    )
    const user = userEvent.setup()
    renderizar()

    await user.click(
      await screen.findByRole("button", {
        name: "Visualizar Almoço no campus",
      }),
    )

    const dialogo = await screen.findByRole("dialog")
    expect(
      await within(dialogo).findByText("Descrição completa do registro"),
    ).toBeInTheDocument()
    expect(within(dialogo).getByText("Registrado em")).toBeInTheDocument()
    expect(within(dialogo).getByText("Atualizado em")).toBeInTheDocument()
    expect(within(dialogo).getByText("Formulário")).toBeInTheDocument()

    const chamadas = fetchMock.mock.calls.map(
      (c) => new URL(String(c[0])).pathname,
    )
    expect(chamadas).toContain(`/api/transactions/${ID_1}`)
  })

  it("mostra o erro do detalhe quando o servidor responde 404", async () => {
    rotas((url) =>
      url.pathname.endsWith(ID_1)
        ? { status: 404, body: erroApi(404, "Lançamento não encontrado.") }
        : { status: 200, body: pagina([item(ID_1)]) },
    )
    const user = userEvent.setup()
    renderizar()

    await user.click(
      await screen.findByRole("button", {
        name: "Visualizar Almoço no campus",
      }),
    )

    await waitFor(() =>
      expect(
        screen.getByText("Lançamento não encontrado."),
      ).toBeInTheDocument(),
    )
  })

  it("oferece editar cada lançamento pela rota de edição", async () => {
    rotas(() => ({ status: 200, body: pagina([item(ID_1)]) }))
    renderizar()

    const editar = await screen.findByRole("link", {
      name: "Editar Almoço no campus",
    })

    expect(editar).toHaveAttribute("href", `/lancamentos/${ID_1}/editar`)
  })

  describe("exclusão", () => {
    it("pede confirmação mostrando o que será excluído, e cancelar não exclui", async () => {
      rotas(() => ({ status: 200, body: pagina([item(ID_1)]) }))
      const user = userEvent.setup()
      renderizar()

      await user.click(
        await screen.findByRole("button", { name: "Excluir Almoço no campus" }),
      )

      const dialogo = await screen.findByRole("alertdialog")
      expect(
        within(dialogo).getByText("Excluir lançamento?"),
      ).toBeInTheDocument()
      expect(within(dialogo).getByText("Almoço no campus")).toBeInTheDocument()
      expect(within(dialogo).getByText(/35,90/)).toBeInTheDocument()
      expect(within(dialogo).getByText("31/08/2026")).toBeInTheDocument()

      await user.click(
        within(dialogo).getByRole("button", { name: "Cancelar" }),
      )

      await waitFor(() =>
        expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
      )
      expect(chamadasDe("DELETE")).toHaveLength(0)
    })

    it("só exclui depois de confirmar, e a lista é recarregada", async () => {
      let excluido = false
      rotas((_, method) => {
        if (method === "DELETE") {
          excluido = true
          return { status: 204, body: null }
        }
        return {
          status: 200,
          body: pagina(
            excluido
              ? [item(ID_2, { description: "Fica" })]
              : [item(ID_1), item(ID_2, { description: "Fica" })],
          ),
        }
      })
      const user = userEvent.setup()
      renderizar()

      await user.click(
        await screen.findByRole("button", { name: "Excluir Almoço no campus" }),
      )
      expect(chamadasDe("DELETE")).toHaveLength(0)

      const dialogo = await screen.findByRole("alertdialog")
      await user.click(within(dialogo).getByRole("button", { name: "Excluir" }))

      await waitFor(() =>
        expect(screen.queryByText("Almoço no campus")).not.toBeInTheDocument(),
      )
      expect(screen.getByText("Fica")).toBeInTheDocument()

      const [[url]] = chamadasDe("DELETE") as [[string]]
      expect(new URL(url).pathname).toBe(`/api/transactions/${ID_1}`)
      expect(chamadasDe("DELETE")).toHaveLength(1)
    })

    it("mantém o diálogo aberto e mostra o erro quando a exclusão falha", async () => {
      rotas((_, method) =>
        method === "DELETE"
          ? { status: 500, body: erroApi(500, "Erro interno.") }
          : { status: 200, body: pagina([item(ID_1)]) },
      )
      const user = userEvent.setup()
      renderizar()

      await user.click(
        await screen.findByRole("button", { name: "Excluir Almoço no campus" }),
      )
      const dialogo = await screen.findByRole("alertdialog")
      await user.click(within(dialogo).getByRole("button", { name: "Excluir" }))

      expect(await within(dialogo).findByRole("alert")).toBeInTheDocument()
      expect(screen.getByRole("alertdialog")).toBeInTheDocument()
    })
  })
})
