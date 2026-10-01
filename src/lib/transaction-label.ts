import type { ApiTransaction } from "@/lib/api/schemas"
import { formatDate } from "@/lib/format"

/**
 * Como nomear um lançamento em botões, avisos e leitores de tela. A descrição
 * é opcional; sem ela, categoria e data distinguem o lançamento dos vizinhos
 * ("Excluir Alimentação de 10/09/2026", e não "Excluir null").
 */
export function transactionLabel(
  item: Pick<ApiTransaction, "description" | "categoryName" | "date">,
): string {
  return item.description ?? `${item.categoryName} de ${formatDate(item.date)}`
}
