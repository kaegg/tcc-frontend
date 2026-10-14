import { useState } from "react"
import { Check, Clock, Loader2, Pencil, RefreshCw, X } from "lucide-react"

import { TransactionTypeBadge } from "@/components/app/transaction-type-badge"
import { TransactionForm } from "@/components/transactions/transaction-form"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import type { CreateTransactionInput } from "@/lib/api/transactions"
import type { Proposal } from "@/lib/chat/protocol"
import { formatCurrency, formatDateLong } from "@/lib/format"
import { apiToCents } from "@/lib/money-input"
import type { ChatMessage, ProposalStatus } from "@/lib/types"

/**
 * Cartão de confirmação de uma proposta interpretada pelo assistente.
 *
 * O modelo interpreta e sugere, mas nada é gravado sem uma confirmação
 * explícita. Editar troca os dados no próprio cartão, com o mesmo formulário
 * da tela de lançamentos, e a proposta continua aguardando confirmação. O
 * estado da proposta é sempre dito em texto, nunca apenas por cor.
 */
export function ProposalCard({
  message,
  busy,
  confirming,
  onConfirm,
  onCancel,
  onEdit,
}: {
  message: ChatMessage
  /** Uma resposta ou outra ação ainda pode alterar o lançamento. */
  busy: boolean
  confirming: boolean
  onConfirm: () => void
  onCancel: () => void
  onEdit: (input: CreateTransactionInput) => Promise<Proposal>
}) {
  const [editing, setEditing] = useState(false)
  const { proposal, proposalStatus = "pendente", proposalEdited } = message
  if (!proposal) return null

  const pending = proposalStatus === "pendente"

  return (
    <div className="mt-3 rounded-xl border border-ai/25 bg-background/60 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">
          {editing && pending
            ? "Editar proposta"
            : "Proposta de lançamento sugerida pela IA"}
        </span>
        <StatusBadge status={proposalStatus} />
      </div>

      {editing && pending ? (
        <div className="mt-4 space-y-3">
          <TransactionForm<Proposal>
            defaultValues={{
              type: proposal.type,
              amountCents: apiToCents(proposal.amount),
              categoryId: proposal.categoryId,
              date: proposal.date,
              description: proposal.description ?? "",
            }}
            save={onEdit}
            onSaved={() => setEditing(false)}
            onCancel={() => setEditing(false)}
            submitLabel="Salvar alterações"
            cancelLabel="Cancelar edição"
            errorTitle="Não foi possível salvar as alterações"
          />
          <p className="text-xs text-muted-foreground">
            Salvar só atualiza a proposta. O lançamento é gravado quando você
            confirmar.
          </p>
        </div>
      ) : (
        <>
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
                {formatCurrency(Number(proposal.amount))}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Categoria</dt>
              <dd className="mt-1">{proposal.categoryName}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Data</dt>
              <dd className="mt-1">
                {formatDateLong(proposal.date)}
                {proposal.dateDefaulted && (
                  <span className="block text-xs text-muted-foreground">
                    Data de hoje, porque nenhuma foi informada
                  </span>
                )}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-xs text-muted-foreground">Descrição</dt>
              <dd className="mt-1 break-words">
                {proposal.description ?? (
                  <span className="text-muted-foreground">Sem descrição</span>
                )}
              </dd>
            </div>
          </dl>

          {proposalEdited && (
            <p className="mt-3 text-xs text-muted-foreground">
              Dados corrigidos por você.
            </p>
          )}

          {pending && (
            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                className="h-8"
                disabled={busy || confirming}
                onClick={onConfirm}
              >
                {confirming ? <Loader2 className="animate-spin" /> : <Check />}
                {confirming ? "Registrando..." : "Confirmar"}
              </Button>
              <Button
                variant="outline"
                className="h-8"
                disabled={busy || confirming}
                onClick={() => setEditing(true)}
              >
                <Pencil />
                Editar
              </Button>
              <Button
                variant="ghost"
                className="h-8"
                disabled={busy || confirming}
                onClick={onCancel}
              >
                <X />
                Cancelar
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: ProposalStatus }) {
  switch (status) {
    case "confirmada":
      return (
        <Badge
          variant="outline"
          className="border-success/30 bg-success/10 text-success"
        >
          <Check aria-hidden="true" />
          Registrada
        </Badge>
      )
    case "cancelada":
      return (
        <Badge variant="outline" className="text-muted-foreground">
          <X aria-hidden="true" />
          Cancelada
        </Badge>
      )
    case "substituida":
      return (
        <Badge variant="outline" className="text-muted-foreground">
          <RefreshCw aria-hidden="true" />
          Substituída
        </Badge>
      )
    case "expirada":
      return (
        <Badge variant="outline" className="text-muted-foreground">
          <Clock aria-hidden="true" />
          Expirada
        </Badge>
      )
    case "pendente":
      return (
        <Badge variant="outline" className="border-ai/30 text-ai-accent">
          Aguardando confirmação
        </Badge>
      )
  }
}
