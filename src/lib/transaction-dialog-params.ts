import type { TransactionDialogTarget } from "@/components/transactions/transaction-dialog"
import { TRANSACTION_DIALOG_PARAMS } from "@/routes/paths"

const { new: NEW, edit: EDIT } = TRANSACTION_DIALOG_PARAMS

/** Qual modal a URL pede aberto. Edição vence se as duas chaves vierem juntas. */
export function dialogTargetFromParams(
  params: URLSearchParams,
): TransactionDialogTarget | null {
  const id = params.get(EDIT)
  if (id) return { kind: "edit", id }
  if (params.get(NEW) === "1") return { kind: "new" }
  return null
}

/** Abre o modal sem mexer em filtros e página, que ficam visíveis por trás. */
export function withDialog(
  params: URLSearchParams,
  target: TransactionDialogTarget,
): URLSearchParams {
  const next = withoutDialog(params)

  if (target.kind === "edit") next.set(EDIT, target.id)
  else next.set(NEW, "1")

  return next
}

export function withoutDialog(params: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(params)

  next.delete(NEW)
  next.delete(EDIT)

  return next
}
