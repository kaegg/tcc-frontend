import { z } from "zod"

import { apiGet, apiPost } from "@/lib/api/client"

const statusSchema = z.object({ collecting: z.boolean() })

/** Se este navegador deve medir: coleta ligada no servidor e termos aceitos. */
export function fetchMetricsStatus(signal?: AbortSignal) {
  return apiGet("/metrics/status", statusSchema, { signal }).then(
    (body) => body.collecting,
  )
}

export type MetricTask =
  "registro-despesa" | "registro-receita" | "registro" | "consulta"

export type MetricInput = {
  participantCode: string
  sessionCode: string
  mode: "formulario" | "assistente"
  task: MetricTask
  durationMs: number
  interactionCount: number
  errorCount: number
  outcome: "sucesso" | "falha" | "abandono"
}

export function recordMetric(input: MetricInput) {
  return apiPost("/metrics", input, z.null())
}
