import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useEffect } from "react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import { MetricsProvider } from "@/components/metrics/metrics-provider"
import { useMetrics } from "@/hooks/use-metrics"

const CONTA = "0199a1b2-c3d4-7000-8000-0000000000aa"

vi.mock("@/hooks/use-session", () => ({
  useAuthenticatedUser: () => ({
    id: CONTA,
    name: "Ana Souza",
    email: "ana@exemplo.com",
    initials: "AS",
  }),
}))

let fetchMock: ReturnType<typeof vi.fn>
let relogio = 0

function servidor(collecting: boolean) {
  fetchMock = vi.fn((url: string) =>
    Promise.resolve(
      url.endsWith("/metrics/status")
        ? new Response(JSON.stringify({ collecting }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        : new Response(null, { status: 204 }),
    ),
  )
  vi.stubGlobal("fetch", fetchMock)
}

const enviadas = () =>
  fetchMock.mock.calls
    .filter(([url]) => String(url).endsWith("/metrics"))
    .map(
      ([, init]) =>
        JSON.parse((init as RequestInit).body as string) as Record<
          string,
          unknown
        >,
    )

function Tela() {
  const metrics = useMetrics()
  return (
    <>
      <button
        type="button"
        onClick={() => metrics.start("formulario-registro")}
      >
        Abrir formulário
      </button>
      <button type="button">Clique qualquer</button>
      <button
        type="button"
        onClick={() => metrics.error("formulario-registro")}
      >
        Erro
      </button>
      <button
        type="button"
        onClick={() =>
          metrics.finish("formulario-registro", "concluida", "registro-despesa")
        }
      >
        Salvar
      </button>
      <button
        type="button"
        onClick={() =>
          metrics.finish("formulario-registro", "interrompida", "registro")
        }
      >
        Fechar
      </button>
    </>
  )
}

async function abrir(collecting: boolean) {
  servidor(collecting)
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MetricsProvider>
        <Tela />
      </MetricsProvider>
    </QueryClientProvider>,
  )
  await waitFor(() => expect(fetchMock).toHaveBeenCalled())
  // Deixa o status chegar antes de começar.
  await new Promise((resolve) => setTimeout(resolve, 0))
  return userEvent.setup()
}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  relogio = 0
  vi.spyOn(performance, "now").mockImplementation(() => relogio)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe("MetricsProvider", () => {
  it("com a coleta desligada no servidor, nada é medido nem enviado", async () => {
    const user = await abrir(false)

    await user.click(screen.getByRole("button", { name: "Abrir formulário" }))
    relogio = 5000
    await user.click(screen.getByRole("button", { name: "Salvar" }))

    expect(enviadas()).toHaveLength(0)
  })

  it("mede cliques e tempo da tarefa e envia só códigos anônimos", async () => {
    const user = await abrir(true)

    await user.click(screen.getByRole("button", { name: "Abrir formulário" }))
    await user.click(screen.getByRole("button", { name: "Clique qualquer" }))
    await user.click(screen.getByRole("button", { name: "Clique qualquer" }))
    relogio = 42_500
    await user.click(screen.getByRole("button", { name: "Salvar" }))

    await waitFor(() => expect(enviadas()).toHaveLength(1))
    const [metrica] = enviadas()
    expect(metrica).toMatchObject({
      mode: "formulario",
      task: "registro-despesa",
      durationMs: 42_500,
      // Os dois cliques e o próprio "Salvar"; o que abriu a tarefa veio antes.
      interactionCount: 3,
      errorCount: 0,
      outcome: "sucesso",
    })
    const uuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
    expect(metrica.participantCode).toMatch(uuid)
    expect(metrica.sessionCode).toMatch(uuid)
    expect(JSON.stringify(metrica)).not.toContain(CONTA)
    expect(JSON.stringify(metrica)).not.toContain("ana@exemplo.com")
  })

  it("o mesmo navegador e a mesma conta mantêm o código entre tarefas", async () => {
    const user = await abrir(true)

    for (let vez = 0; vez < 2; vez++) {
      relogio = 0
      await user.click(screen.getByRole("button", { name: "Abrir formulário" }))
      relogio = 3000
      await user.click(screen.getByRole("button", { name: "Salvar" }))
    }

    await waitFor(() => expect(enviadas()).toHaveLength(2))
    const [primeira, segunda] = enviadas()
    expect(primeira.participantCode).toBe(segunda.participantCode)
    expect(primeira.sessionCode).toBe(segunda.sessionCode)
  })

  it("interrompida com erro é falha; sem erro, abandono", async () => {
    const user = await abrir(true)

    await user.click(screen.getByRole("button", { name: "Abrir formulário" }))
    await user.click(screen.getByRole("button", { name: "Erro" }))
    relogio = 9000
    await user.click(screen.getByRole("button", { name: "Fechar" }))

    relogio = 10_000
    await user.click(screen.getByRole("button", { name: "Abrir formulário" }))
    relogio = 14_000
    await user.click(screen.getByRole("button", { name: "Fechar" }))

    await waitFor(() => expect(enviadas()).toHaveLength(2))
    expect(enviadas().map((m) => [m.outcome, m.errorCount])).toEqual([
      ["falha", 1],
      ["abandono", 0],
    ])
  })

  it("passar por uma tela em menos de um segundo, sem interação, não é tarefa", async () => {
    servidor(true)
    const client = new QueryClient()
    const tela = (visivel: boolean) => (
      <QueryClientProvider client={client}>
        <MetricsProvider>{visivel && <Visita />}</MetricsProvider>
      </QueryClientProvider>
    )
    const { rerender } = render(tela(false))
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    await new Promise((resolve) => setTimeout(resolve, 0))

    rerender(tela(true))
    relogio = 300
    rerender(tela(false))

    rerender(tela(true))
    relogio = 5300
    rerender(tela(false))

    await waitFor(() => expect(enviadas()).toHaveLength(1))
    expect(enviadas()[0]).toMatchObject({
      task: "consulta",
      durationMs: 5000,
      outcome: "abandono",
    })
  })
})

/** Mede do montar ao desmontar, como a tela de Relatórios. */
function Visita() {
  const metrics = useMetrics()
  useEffect(() => {
    metrics.start("formulario-consulta")
    return () =>
      metrics.finish("formulario-consulta", "interrompida", "consulta")
  }, [metrics])
  return null
}
