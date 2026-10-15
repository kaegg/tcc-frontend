import { createContext } from "react"

import type { MetricTask } from "@/lib/api/metrics"

/** A tarefa medida e o modo em que acontece. */
export type MetricFlow =
  | "formulario-registro"
  | "formulario-consulta"
  | "assistente-registro"
  | "assistente-consulta"

export type MetricsApi = {
  /** Começa a medir, se ainda não estiver medindo esta tarefa. */
  start: (flow: MetricFlow, startedAt?: number) => void
  isActive: (flow: MetricFlow) => boolean
  /** Mensagem enviada (assistente). No formulário, os cliques são contados sozinhos. */
  interaction: (flow: MetricFlow) => void
  error: (flow: MetricFlow) => void
  /**
   * `concluida`: lançamento gravado ou relatório exibido. `interrompida`: a
   * tarefa acabou sem isso — falha se houve erro, abandono se não houve.
   */
  finish: (
    flow: MetricFlow,
    result: "concluida" | "interrompida",
    task: MetricTask,
  ) => void
}

export const MetricsContext = createContext<MetricsApi | null>(null)
