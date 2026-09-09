import { apiGet } from "@/lib/api/client"
import {
  categoryListSchema,
  type Category,
  type TransactionType,
} from "@/lib/api/schemas"

/** Categorias ativas do sistema, opcionalmente de um só tipo. */
export async function fetchCategories(
  type?: TransactionType,
  signal?: AbortSignal
): Promise<Category[]> {
  const response = await apiGet("/categories", categoryListSchema, {
    query: { type },
    signal,
  })

  return response.data
}
