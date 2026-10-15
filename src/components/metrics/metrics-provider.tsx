import { useEffect, useMemo, useRef, type ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"

import { useAuthenticatedUser } from "@/hooks/use-session"
import { fetchMetricsStatus, recordMetric } from "@/lib/api/metrics"
import { participantCode, sessionCode } from "@/lib/metrics/anonymous-ids"
import {
  MetricsContext,
  type MetricFlow,
  type MetricsApi,
} from "@/lib/metrics/context"

type Running = { startedAt: number; interactions: number; errors: number }

/**
 * Coleta passiva das métricas de uso (TCC-030): cada cadastro e cada consulta,
 * nos dois modos, sem tela nem aviso durante o uso — o aviso está nos Termos
 * de Uso aceitos no cadastro. Se o servidor disser que não coleta (variável
 * desligada ou conta anterior aos termos), nada é medido nem enviado.
 */
export function MetricsProvider({ children }: { children: ReactNode }) {
  const user = useAuthenticatedUser()
  const status = useQuery({
    queryKey: ["metrics", "status"],
    queryFn: ({ signal }) => fetchMetricsStatus(signal),
    staleTime: Infinity,
    retry: false,
  })
  const collecting = status.data === true
  const running = useRef(new Map<MetricFlow, Running>())

  // No formulário, o esforço é medido em cliques em qualquer ponto da tela.
  useEffect(() => {
    if (!collecting) return
    const onClick = () => {
      for (const [flow, task] of running.current) {
        if (flow.startsWith("formulario")) task.interactions += 1
      }
    }
    document.addEventListener("click", onClick, true)
    return () => document.removeEventListener("click", onClick, true)
  }, [collecting])

  const api = useMemo<MetricsApi>(
    () => ({
      start: (flow, startedAt = performance.now()) => {
        if (!collecting || running.current.has(flow)) return
        running.current.set(flow, { startedAt, interactions: 0, errors: 0 })
      },
      isActive: (flow) => running.current.has(flow),
      interaction: (flow) => {
        const task = running.current.get(flow)
        if (task) task.interactions += 1
      },
      error: (flow) => {
        const task = running.current.get(flow)
        if (task) task.errors += 1
      },
      finish: (flow, result, taskCode) => {
        const task = running.current.get(flow)
        if (!task) return
        running.current.delete(flow)
        const durationMs = Math.round(performance.now() - task.startedAt)
        // Passar por uma tela sem tocar em nada em menos de um segundo não é
        // tarefa (e é o que o StrictMode faz ao montar duas vezes).
        if (
          result === "interrompida" &&
          task.interactions === 0 &&
          durationMs < 1000
        ) {
          return
        }
        const outcome =
          result === "concluida"
            ? "sucesso"
            : task.errors > 0
              ? "falha"
              : "abandono"
        // Falhar ao enviar não pode atrapalhar quem está usando o sistema.
        void recordMetric({
          participantCode: participantCode(user.id),
          sessionCode: sessionCode(),
          mode: flow.startsWith("formulario") ? "formulario" : "assistente",
          task: taskCode,
          durationMs: Math.max(0, durationMs),
          interactionCount: task.interactions,
          errorCount: task.errors,
          outcome,
        }).catch(() => undefined)
      },
    }),
    [collecting, user.id],
  )

  return <MetricsContext value={api}>{children}</MetricsContext>
}
