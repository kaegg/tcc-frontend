import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  TransactionDialog,
  type TransactionDialogTarget,
} from "@/components/transactions/transaction-dialog"

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
  path: "/api/transactions",
  timestamp: "2026-09-25T12:00:00.000Z",
})

type Resposta = { status: number; body: unknown }

let fetchMock: ReturnType<typeof vi.fn>

function rotas(tabela: (url: URL, method: string) => Resposta | undefined) {
  fetchMock.mockImplementation((url: string, init?: RequestInit) => {
    const alvo = new URL(url)
    const resposta =
      tabela(alvo, init?.method ?? "GET") ??
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

/** O lançamento existente responde ao GET; o PATCH devolve `aposSalvar`. */
function servidorDeEdicao(aposSalvar: Resposta = { status: 200, body: ATUAL }) {
  rotas((url, method) => {
    if (url.pathname !== `/api/transactions/${ID}`) return undefined
    return method === "PATCH" ? aposSalvar : { status: 200, body: ATUAL }
  })
}

const chamadas = (method: string) =>
  fetchMock.mock.calls.filter(
    (c) => (c[1] as RequestInit | undefined)?.method === method,
  )

const corpo = (method: string) => {
  const [[, init]] = chamadas(method) as [[string, RequestInit]]
  return JSON.parse(init.body as string) as Record<string, unknown>
}

let onClose: ReturnType<typeof vi.fn<() => void>>

function renderizar(target: TransactionDialogTarget) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })

  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <TransactionDialog target={target} onClose={onClose} />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const categoriaCarregada = (nome: string) =>
  waitFor(() =>
    expect(screen.getByLabelText("Categoria")).toHaveTextContent(nome),
  )

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] })
  vi.setSystemTime(new Date(2026, 8, 25, 12))
  fetchMock = vi.fn()
  vi.stubGlobal("fetch", fetchMock)
  onClose = vi.fn<() => void>()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe("TransactionDialog: edição", () => {
  it("abre com os dados persistidos, lidos do servidor", async () => {
    servidorDeEdicao()
    renderizar({ kind: "edit", id: ID })

    expect(
      screen.getByRole("dialog", { name: "Editar lançamento" }),
    ).toBeInTheDocument()
    expect(await screen.findByLabelText("Valor")).toHaveValue("35,90")
    expect(screen.getByLabelText("Data")).toHaveValue("2026-08-31")
    expect(screen.getByLabelText(/Descrição/)).toHaveValue("Almoço no campus")
    await categoriaCarregada("Alimentação")
  })

  it("salva com PATCH o formulário inteiro e fecha", async () => {
    servidorDeEdicao({ status: 200, body: { ...ATUAL, amount: "42.00" } })
    const user = userEvent.setup()
    renderizar({ kind: "edit", id: ID })

    const valor = await screen.findByLabelText("Valor")
    await categoriaCarregada("Alimentação")
    await user.clear(valor)
    // Preenchido pela direita: 4, 2, 0, 0 → R$ 42,00.
    await user.type(valor, "4200")
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }))

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
    expect(corpo("PATCH")).toEqual({
      type: "despesa",
      amount: "42.00",
      categoryId: ALIMENTACAO,
      date: "2026-08-31",
      description: "Almoço no campus",
    })
  })

  it("apagar a descrição envia nula, porque ela é opcional", async () => {
    servidorDeEdicao({ status: 200, body: { ...ATUAL, description: null } })
    const user = userEvent.setup()
    renderizar({ kind: "edit", id: ID })

    await screen.findByLabelText("Valor")
    await categoriaCarregada("Alimentação")
    await user.clear(screen.getByLabelText(/Descrição/))
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }))

    await waitFor(() => expect(onClose).toHaveBeenCalled())
    expect(corpo("PATCH")).toMatchObject({ description: null })
  })

  it("aplica as validações do cadastro antes de enviar", async () => {
    servidorDeEdicao()
    const user = userEvent.setup()
    renderizar({ kind: "edit", id: ID })

    const valor = await screen.findByLabelText("Valor")
    await user.clear(valor)
    const descricao = screen.getByLabelText(/Descrição/)
    await user.clear(descricao)
    await user.type(descricao, "ab")
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }))

    expect(await screen.findByText("Informe o valor.")).toBeInTheDocument()
    expect(
      screen.getByText("Descreva o lançamento com pelo menos 3 caracteres."),
    ).toBeInTheDocument()
    expect(chamadas("PATCH")).toHaveLength(0)
    expect(onClose).not.toHaveBeenCalled()
  })

  it("marca no campo o erro que o backend atribui a ele", async () => {
    servidorDeEdicao({
      status: 400,
      body: erroApi(400, "Informe uma data válida.", {
        date: ["Informe uma data válida."],
      }),
    })
    const user = userEvent.setup()
    renderizar({ kind: "edit", id: ID })

    await screen.findByLabelText("Valor")
    await categoriaCarregada("Alimentação")
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }))

    expect(
      await screen.findByText("Informe uma data válida."),
    ).toBeInTheDocument()
    expect(screen.getByLabelText("Data")).toHaveAttribute(
      "aria-invalid",
      "true",
    )
    expect(onClose).not.toHaveBeenCalled()
  })

  it("inexistente, excluído ou alheio mostra 404 sem oferecer nova tentativa", async () => {
    rotas((url) =>
      url.pathname === `/api/transactions/${ID}`
        ? { status: 404, body: erroApi(404, "Lançamento não encontrado.") }
        : undefined,
    )
    renderizar({ kind: "edit", id: ID })

    expect(
      await screen.findByText("Lançamento não encontrado."),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole("button", { name: "Tentar novamente" }),
    ).not.toBeInTheDocument()
    expect(screen.queryByLabelText("Valor")).not.toBeInTheDocument()
  })
})

describe("TransactionDialog: novo lançamento", () => {
  it("abre vazio, com a data de hoje no fuso local", async () => {
    rotas(() => undefined)
    renderizar({ kind: "new" })

    expect(
      screen.getByRole("dialog", { name: "Novo lançamento" }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText("Valor")).toHaveValue("")
    expect(screen.getByLabelText("Data")).toHaveValue("2026-09-25")
    expect(screen.getByLabelText(/Descrição/)).toHaveValue("")
    expect(
      screen.getByRole("link", { name: "abrir o assistente" }),
    ).toHaveAttribute("href", "/assistente")
  })

  it("cria com POST, sem descrição, e fecha", async () => {
    rotas((url, method) =>
      url.pathname === "/api/transactions" && method === "POST"
        ? {
            status: 201,
            body: { ...ATUAL, amount: "2.50", description: null },
          }
        : undefined,
    )
    const user = userEvent.setup()
    renderizar({ kind: "new" })

    await user.type(screen.getByLabelText("Valor"), "250")
    await user.click(await screen.findByRole("combobox", { name: "Categoria" }))
    await user.click(await screen.findByRole("option", { name: "Transporte" }))
    await user.click(screen.getByRole("button", { name: "Salvar" }))

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1))
    expect(corpo("POST")).toEqual({
      type: "despesa",
      amount: "2.50",
      categoryId: TRANSPORTE,
      date: "2026-09-25",
      description: null,
    })
  })

  it("sem valor e sem categoria, avisa nos campos e não envia", async () => {
    rotas(() => undefined)
    const user = userEvent.setup()
    renderizar({ kind: "new" })

    await user.click(screen.getByRole("button", { name: "Salvar" }))

    expect(await screen.findByText("Informe o valor.")).toBeInTheDocument()
    expect(screen.getByText("Selecione uma categoria.")).toBeInTheDocument()
    expect(chamadas("POST")).toHaveLength(0)
  })
})

describe("TransactionDialog: fechar sem salvar", () => {
  it("sem alterações, Cancelar fecha na hora", async () => {
    rotas(() => undefined)
    const user = userEvent.setup()
    renderizar({ kind: "new" })

    await user.click(screen.getByRole("button", { name: "Cancelar" }))

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
  })

  it("novo lançamento intocado fecha direto pelo X", async () => {
    rotas(() => undefined)
    const user = userEvent.setup()
    renderizar({ kind: "new" })

    await screen.findByRole("combobox", { name: "Categoria" })
    await user.click(screen.getByRole("button", { name: "Fechar" }))

    expect(onClose).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
  })

  it.each([
    ["Valor", "1"],
    [/Descrição/, "x"],
  ])(
    "digitar e apagar em %s volta ao formulário intocado",
    async (campo, texto) => {
      rotas(() => undefined)
      const user = userEvent.setup()
      renderizar({ kind: "new" })

      await user.type(screen.getByLabelText(campo), texto)
      await user.keyboard("{Backspace}")
      expect(screen.getByLabelText(campo)).toHaveValue("")
      await user.click(screen.getByRole("button", { name: "Fechar" }))

      expect(onClose).toHaveBeenCalledTimes(1)
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument()
    },
  )

  it("com alterações, pergunta antes de descartar", async () => {
    rotas(() => undefined)
    const user = userEvent.setup()
    renderizar({ kind: "new" })

    await user.type(screen.getByLabelText("Valor"), "250")
    await user.click(screen.getByRole("button", { name: "Cancelar" }))

    const alerta = await screen.findByRole("alertdialog", {
      name: "Descartar alterações?",
    })
    expect(onClose).not.toHaveBeenCalled()

    await user.click(
      within(alerta).getByRole("button", { name: "Continuar editando" }),
    )
    await waitFor(() =>
      expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument(),
    )
    expect(screen.getByLabelText("Valor")).toHaveValue("2,50")
    expect(onClose).not.toHaveBeenCalled()

    await user.click(screen.getByRole("button", { name: "Cancelar" }))
    await user.click(
      within(
        await screen.findByRole("alertdialog", {
          name: "Descartar alterações?",
        }),
      ).getByRole("button", { name: "Descartar" }),
    )

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("Esc com alterações também pergunta", async () => {
    rotas(() => undefined)
    const user = userEvent.setup()
    renderizar({ kind: "new" })

    await user.type(screen.getByLabelText("Valor"), "1")
    await user.keyboard("{Escape}")

    expect(
      await screen.findByRole("alertdialog", { name: "Descartar alterações?" }),
    ).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()
  })
})
