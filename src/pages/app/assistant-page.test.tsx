import { act, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { AssistantPage } from "@/pages/app/assistant-page"

type Handler = (...args: unknown[]) => void
type Ack =
  { ok: true; reply?: string } | { ok: false; code: string; message: string }

/** Dublê do socket do Socket.IO com só o que o hook usa. */
class FakeSocket {
  connected = false
  active = true
  auth: unknown
  handlers = new Map<string, Set<Handler>>()
  sent: { event: string; payload: unknown }[] = []
  acks: Ack[] = []
  connects = 0

  on(event: string, handler: Handler) {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set())
    this.handlers.get(event)!.add(handler)
    return this
  }
  off(event: string, handler: Handler) {
    this.handlers.get(event)?.delete(handler)
    return this
  }
  removeAllListeners() {
    this.handlers.clear()
    return this
  }
  fire(event: string, ...args: unknown[]) {
    for (const handler of [...(this.handlers.get(event) ?? [])]) {
      handler(...args)
    }
  }
  connect() {
    this.connects++
    this.active = true
    queueMicrotask(() => {
      this.connected = true
      this.fire("connect")
    })
    return this
  }
  disconnect() {
    this.connected = false
    this.active = false
    this.fire("disconnect", "io client disconnect")
    return this
  }
  emit(event: string, payload: unknown) {
    this.sent.push({ event, payload })
    return this
  }
  timeout() {
    return {
      emitWithAck: (event: string, payload: unknown) => {
        this.sent.push({ event, payload })
        return Promise.resolve(this.acks.shift() ?? { ok: true })
      },
    }
  }
}

const socket = vi.hoisted(() => ({ current: null as unknown }))
const refreshSession = vi.hoisted(() => vi.fn())

vi.mock("socket.io-client", () => ({
  io: () => socket.current,
}))

vi.mock("@/lib/api/auth-session", () => ({
  refreshSession,
}))

let fake: FakeSocket

function enviadas() {
  return fake.sent
    .filter((item) => item.event === "message:send")
    .map(
      (item) =>
        item.payload as {
          id: string
          content: string
          conversationId: string
        },
    )
}

async function abrir() {
  render(
    <MemoryRouter>
      <AssistantPage />
    </MemoryRouter>,
  )
  await screen.findByText("Conectado ao assistente")
}

async function escrever(texto: string) {
  const user = userEvent.setup()
  await user.click(screen.getByRole("button", { name: "Nova conversa" }))
  await user.type(
    screen.getByRole("textbox", { name: "Mensagem para o assistente" }),
    `${texto}{Enter}`,
  )
  return user
}

describe("AssistantPage — gateway do chat (TCC-022)", () => {
  beforeEach(() => {
    Element.prototype.scrollTo = vi.fn()
    fake = new FakeSocket()
    socket.current = fake
    refreshSession.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("mostra a mensagem na hora e a resposta conforme chega", async () => {
    await abrir()
    await escrever("oi")

    const log = screen.getByRole("log", { name: "Mensagens da conversa" })
    expect(within(log).getByText("oi")).toBeInTheDocument()
    expect(within(log).getByText("Pensando…")).toBeInTheDocument()

    const [{ id }] = enviadas()
    act(() => fake.fire("reply:chunk", { id, text: "Olá" }))
    expect(within(log).getByText("Olá")).toBeInTheDocument()

    act(() => fake.fire("reply:chunk", { id, text: ", tudo bem?" }))
    act(() => fake.fire("reply:end", { id }))

    expect(within(log).getByText("Olá, tudo bem?")).toBeInTheDocument()
    expect(within(log).queryByText("Pensando…")).not.toBeInTheDocument()
  })

  it("permite parar a resposta e guarda o que já tinha chegado", async () => {
    await abrir()
    const user = await escrever("conte uma história")
    const [{ id }] = enviadas()
    act(() => fake.fire("reply:chunk", { id, text: "Era uma vez" }))

    await user.click(screen.getByRole("button", { name: "Parar resposta" }))
    expect(fake.sent.at(-1)).toEqual({ event: "reply:cancel", payload: { id } })

    act(() =>
      fake.fire("reply:error", {
        id,
        code: "cancelado",
        message: "A resposta foi interrompida.",
      }),
    )

    expect(screen.getByText("Era uma vez")).toBeInTheDocument()
    expect(screen.getByText("Resposta interrompida.")).toBeInTheDocument()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("mostra a falha e tenta de novo sem repetir a mensagem do usuário", async () => {
    await abrir()
    const user = await escrever("oi")
    const [{ id }] = enviadas()

    act(() =>
      fake.fire("reply:error", {
        id,
        code: "indisponivel",
        message: "O assistente está indisponível no momento.",
      }),
    )

    const alerta = screen.getByRole("alert")
    expect(
      within(alerta).getByText("O assistente está indisponível no momento."),
    ).toBeInTheDocument()

    await user.click(
      within(alerta).getByRole("button", { name: "Tentar novamente" }),
    )

    expect(enviadas()).toHaveLength(2)
    expect(enviadas()[1].content).toBe("oi")
    expect(enviadas()[1].id).not.toBe(id)
    const log = screen.getByRole("log", { name: "Mensagens da conversa" })
    expect(within(log).getAllByText("oi")).toHaveLength(1)
  })

  it("trata a recusa do servidor no envio", async () => {
    fake.acks.push({
      ok: false,
      code: "limite_excedido",
      message: "Muitas mensagens em pouco tempo. Aguarde um instante.",
    })
    await abrir()
    await escrever("oi")

    expect(
      await screen.findByText(
        "Muitas mensagens em pouco tempo. Aguarde um instante.",
      ),
    ).toBeInTheDocument()
    expect(screen.queryByText("Pensando…")).not.toBeInTheDocument()
  })

  it("informa a queda da conexão durante a resposta e oferece reconectar", async () => {
    await abrir()
    const user = await escrever("oi")

    act(() => {
      fake.connected = false
      fake.active = false
      fake.fire("disconnect", "transport close")
    })

    expect(screen.getByText("Sem conexão com o assistente")).toBeInTheDocument()
    expect(
      screen.getByText("A conexão com o assistente caiu. Tente novamente."),
    ).toBeInTheDocument()
    expect(
      screen.getByRole("button", { name: "Enviar mensagem" }),
    ).toBeDisabled()

    await user.click(screen.getByRole("button", { name: "Reconectar" }))
    expect(
      await screen.findByText("Conectado ao assistente"),
    ).toBeInTheDocument()
  })

  it("renova a sessão vencida e reenvia a mensagem", async () => {
    refreshSession.mockResolvedValue(true)
    fake.acks.push({
      ok: false,
      code: "sessao_expirada",
      message: "Sua sessão expirou. Entre novamente.",
    })
    await abrir()
    await escrever("oi")

    await waitFor(() => expect(enviadas()).toHaveLength(2))
    expect(refreshSession).toHaveBeenCalledTimes(1)
    expect(fake.connects).toBe(2)
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("renova a sessão quando o servidor recusa o handshake", async () => {
    refreshSession.mockResolvedValue(true)
    render(
      <MemoryRouter>
        <AssistantPage />
      </MemoryRouter>,
    )
    await screen.findByText("Conectado ao assistente")

    act(() => {
      fake.connected = false
      fake.active = false
      fake.fire(
        "connect_error",
        Object.assign(new Error("Sua sessão expirou."), {
          data: { code: "sessao_expirada" },
        }),
      )
    })

    await waitFor(() => expect(refreshSession).toHaveBeenCalledTimes(1))
    await waitFor(() => expect(fake.connects).toBe(2))
  })
})

describe("AssistantPage — lançamento em andamento (TCC-025)", () => {
  beforeEach(() => {
    Element.prototype.scrollTo = vi.fn()
    fake = new FakeSocket()
    socket.current = fake
    refreshSession.mockReset()
  })

  async function responderComPendencia(pending: unknown) {
    await abrir()
    const user = await escrever("gastei no mercado")
    const [{ id }] = enviadas()
    act(() => fake.fire("reply:chunk", { id, text: "Qual foi o valor?" }))
    act(() => fake.fire("reply:end", { id, pending }))
    return user
  }

  it("mostra o que falta no lançamento em andamento", async () => {
    await responderComPendencia({ missing: ["valor"], ready: false })

    expect(screen.getByText("Lançamento em andamento")).toBeInTheDocument()
    expect(screen.getByText(/falta valor/)).toBeInTheDocument()
  })

  it("avisa quando os dados estão completos", async () => {
    await responderComPendencia({ missing: [], ready: true })

    expect(
      screen.getByText(/dados completos, confira antes de registrar/),
    ).toBeInTheDocument()
  })

  it("não mostra o aviso sem lançamento em andamento", async () => {
    await responderComPendencia(null)

    expect(
      screen.queryByText("Lançamento em andamento"),
    ).not.toBeInTheDocument()
  })

  it("cancela pelo botão e mostra a confirmação do assistente", async () => {
    const user = await responderComPendencia({
      missing: ["valor"],
      ready: false,
    })
    fake.acks.push({
      ok: true,
      reply:
        "Tudo bem, cancelei o lançamento em andamento. Nada foi registrado.",
    })

    await user.click(
      screen.getByRole("button", { name: "Cancelar lançamento" }),
    )

    const pedido = fake.sent.at(-1)
    expect(pedido?.event).toBe("operation:cancel")
    expect(pedido?.payload).toEqual({
      conversationId: enviadas()[0].conversationId,
    })
    expect(await screen.findByText(/Nada foi registrado/)).toBeInTheDocument()
    expect(
      screen.queryByText("Lançamento em andamento"),
    ).not.toBeInTheDocument()
  })
})
