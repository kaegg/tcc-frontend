import { ArrowDownRight, ArrowUpRight } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { TransactionType } from "@/lib/types"

/**
 * Identifica o tipo do lançamento.
 */
export function TransactionTypeBadge({ type }: { type: TransactionType }) {
  const isReceita = type === "receita"

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1",
        isReceita
          ? "border-success/30 bg-success/10 text-success"
          : "border-chart-2/30 bg-chart-2/10 text-chart-2",
      )}
    >
      {isReceita ? (
        <ArrowUpRight aria-hidden="true" />
      ) : (
        <ArrowDownRight aria-hidden="true" />
      )}
      {isReceita ? "Receita" : "Despesa"}
    </Badge>
  )
}
