import { apiGet } from "@/lib/api/client"
import { healthSchema, type Health } from "@/lib/api/schemas"

/**
 * Disponibilidade da API.
 */
export function fetchHealth(signal?: AbortSignal): Promise<Health> {
  return apiGet("/health", healthSchema, {
    signal,
    acceptStatuses: [503],
    timeoutMs: 5_000,
  })
}
