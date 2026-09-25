import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { EditTransactionPage } from "@/pages/app/edit-transaction-page"

const ID = "0199a1b2-c3d4-7000-8000-0000000000f1"
const ALIMENTACAO = "0199a1b2-c3d4-7000-8000-00000000c001"
const TRANSPORTE = "0199a1b2-c3d4-7000-8000-00000000c002"
const SALARIO = "0199a1b2-c3d4-7000-8000-00000000c101"

const CATEGORIAS = {
  data: [
    { id: ALIMENTACAO, name: "Alimentação", type: "despesa" },
    { id: TRANSPORTE, name: "Transporte", type: "despesa" },
    { id: SALARIO, name: "Salário", type: "receita" },
  ],
}

const ATUAL = {
  id: ID,
  type: "despesa",
  amount: "35.90",
  date: "2026-08-31",
  description: "Almoço no campus",
  categoryId: ALIMENTACAO,
  categoryName: "Alimentação",
  source: "formulario",
  createdAt: "2026-09-01T15:30:00.000Z",
  updatedAt: "2026-09-01T15:30:00.000Z",
}

const erroApi = (
  statusCode: number,
  message: string,
  fieldErrors?: Record<string, string[]>,
) => ({
  statusCode,
  error: "Erro",
  message,
  fieldErrors,
  path: `/api/transactions/${ID}`,
  timestamp: "2026-09-24T12:00:00.000Z",
})

type Resposta = { status: number; body: unknown }

let fetchMock: ReturnType<typeof vi.fn>

function rotas(tabela: (url: URL, method: string) => Resposta | undefined) {
  fetchMock.mockImplementation((url: string, init?: RequestInit) => {
    const alvo = new URL(url)
    const method = init?.method ?? "GET"
    const resposta =
      tabela(alvo, method) ??
      (alvo.pathname === "/api/categories"
        ? { status: 200, body: CATEGORIAS }
        : { status: 404, body: erroApi(404, "Rota não prevista.") })

    return Promise.resolve(
      new Response(JSON.stringify(resposta.body), {
        status: resposta.status,
        headers: { "Content-Type": "application/json" },
      }),
    )
  })
}

const patches = () =>
  fetchMock.mock.calls.filter(
    (c) => (c[1] as RequestInit | undefined)?.method === "PATCH",
  )

function renderizar(): void {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/lancamentos/${ID}/editar`]}>
        <Routes>
          <Route
            path="/lancamentos/:id/editar"
            element={<EditTransactionPage />}
          />
          <Route path="/lancamentos" element={<p>Lista de lançamentos</p>} />
        </Routes>
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

describe("EditTransactionPage", () => {
  it("abre com os dados persistidos, lidos do servidor", async () => {
    rotas((url) =>
      url.pathname === `/api/transactions/${ID}`
        ? { status: 200, body: ATUAL }
        : undefined,
    )
    renderizar()

    expect(await screen.findByLabelText("Valor")).toHaveValue(35.9)
    expect(screen.getByLabelText("Data")).toHaveValue("2026-08-31")
    expect(screen.getByLabelText("Descrição")).toHaveValue("Almoço no campus")
    await waitFor(() =>
      expect(screen.getByLabelText("Categoria")).toHaveTextContent(
        "Alimentação",
      ),
    )
  })

  it("salva com PATCH o formulário inteiro e volta para a lista", async () => {
    rotas((url, method) => {
      if (url.pathname !== `/api/transactions/${ID}`) return undefined
      return method === "PATCH"
        ? { status: 200, body: { ...ATUAL, amount: "42.00" } }
        : { status: 200, body: ATUAL }
    })
    const user = userEvent.setup()
    renderizar()

    const valor = await screen.findByLabelText("Valor")
    await waitFor(() =>
      expect(screen.getByLabelText("Categoria")).toHaveTextContent(
        "Alimentação",
      ),
    )
    await user.clear(valor)
    await user.type(valor, "42")
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }))

    expect(await screen.findByText("Lista de lançamentos")).toBeInTheDocument()
    const [[, init]] = patches() as [[string, RequestInit]]
    expect(JSON.parse(init.body as string)).toEqual({
      type: "despesa",
      amount: "42.00",
      categoryId: ALIMENTACAO,
      date: "2026-08-31",
      description: "Almoço no campus",
    })
  })

  it("aplica as validações do cadastro antes de enviar", async () => {
    rotas((url) =>
      url.pathname === `/api/transactions/${ID}`
        ? { status: 200, body: ATUAL }
        : undefined,
    )
    const user = userEvent.setup()
    renderizar()

    const valor = await screen.findByLabelText("Valor")
    await user.clear(valor)
    await user.type(valor, "0")
    const descricao = screen.getByLabelText("Descrição")
    await user.clear(descricao)
    await user.type(descricao, "ab")
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }))

    expect(
      await screen.findByText("O valor deve ser maior que zero."),
    ).toBeInTheDocument()
    expect(
      screen.getByText("Descreva o lançamento com pelo menos 3 caracteres."),
    ).toBeInTheDocument()
    expect(patches()).toHaveLength(0)
  })

  it("trocar o tipo limpa a categoria e exige uma compatível", async () => {
    rotas((url) =>
      url.pathname === `/api/transactions/${ID}`
        ? { status: 200, body: ATUAL }
        : undefined,
    )
    const user = userEvent.setup()
    renderizar()

    await screen.findByLabelText("Valor")
    await user.click(screen.getByRole("tab", { name: "Receita" }))
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }))

    expect(
      await screen.findByText("Selecione uma categoria."),
    ).toBeInTheDocument()
    expect(patches()).toHaveLength(0)
  })

  it("marca no campo o erro que o backend atribui a ele", async () => {
    rotas((url, method) => {
      if (url.pathname !== `/api/transactions/${ID}`) return undefined
      return method === "PATCH"
        ? {
            status: 400,
            body: erroApi(400, "Informe uma data válida.", {
              date: ["Informe uma data válida."],
            }),
          }
        : { status: 200, body: ATUAL }
    })
    const user = userEvent.setup()
    renderizar()

    await screen.findByLabelText("Valor")
    await waitFor(() =>
      expect(screen.getByLabelText("Categoria")).toHaveTextContent(
        "Alimentação",
      ),
    )
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }))

    expect(
      await screen.findByText("Informe uma data válida."),
    ).toBeInTheDocument()
    expect(screen.getByLabelText("Data")).toHaveAttribute(
      "aria-invalid",
      "true",
    )
  })

  it("lançamento inexistente, excluído ou alheio mostra 404 sem oferecer nova tentativa", async () => {
    rotas((url) =>
      url.pathname === `/api/transactions/${ID}`
        ? { status: 404, body: erroApi(404, "Lançamento não encontrado.") }
        : undefined,
    )
    renderizar()

    expect(
      await screen.findByText("Lançamento não encontrado."),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Tentar novamente" }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole("link", { name: "Voltar aos lançamentos" }),
    ).toBeInTheDocument()
    expect(screen.queryByLabelText("Valor")).not.toBeInTheDocument()
  })
})
