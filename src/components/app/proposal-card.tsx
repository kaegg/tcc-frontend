import { Check, Pencil, X } from "lucide-react"

import { TransactionTypeBadge } from "@/components/app/transaction-type-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { categoryName } from "@/lib/demo-data"
import { formatCurrency, formatDateLong } from "@/lib/format"
import type { ChatMessage } from "@/lib/types"

/**
 * Cartão de confirmação de uma proposta interpretada pelo assistente.
 *
 * o modelo interpreta e sugere, mas nada é gravado sem uma confirmação explícita.
 * O estado da proposta é sempre dito em texto, nunca apenas por cor.
 */
export function ProposalCard({
  message,
  onConfirm,
  onEdit,
  onCancel,
}: {
  message: ChatMessage
  onConfirm: () => void
  onEdit: () => void
  onCancel: () => void
}) {
  const { proposal, proposalStatus = "pendente" } = message
  if (!proposal) return null

  return (
    <div className="mt-3 rounded-xl border border-ai/25 bg-background/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          Proposta de lançamento
        </span>
        <StatusBadge status={proposalStatus} />
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-xs text-muted-foreground">Tipo</dt>
          <dd className="mt-1">
            <TransactionTypeBadge type={proposal.type} />
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Valor</dt>
          <dd className="financial-value mt-1">
            {formatCurrency(proposal.amount)}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Categoria</dt>
          <dd className="mt-1">{categoryName(proposal.categoryId)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted-foreground">Data</dt>
          <dd className="mt-1">{formatDateLong(proposal.date)}</dd>
        </div>
      </dl>

      {proposalStatus === "pendente" && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button className="h-8" onClick={onConfirm}>
            <Check />
            Confirmar
          </Button>
          <Button variant="outline" className="h-8" onClick={onEdit}>
            <Pencil />
            Editar
          </Button>
          <Button variant="ghost" className="h-8" onClick={onCancel}>
            <X />
            Cancelar
          </Button>
        </div>
      )}
    </div>
  )
}

function StatusBadge({
  status,
}: {
  status: "pendente" | "confirmada" | "cancelada"
}) {
  if (status === "confirmada") {
    return (
      <Badge
        variant="outline"
        className="border-success/30 bg-success/10 text-success"
      >
        <Check aria-hidden="true" />
        Registrada
      </Badge>
    )
  }

  if (status === "cancelada") {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        <X aria-hidden="true" />
        Cancelada
      </Badge>
    )
  }

  return (
    <Badge variant="outline" className="border-ai/30 text-ai-accent">
      Aguardando confirmação
    </Badge>
  )
}
