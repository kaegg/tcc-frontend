import { useCallback, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { CircleAlert, RefreshCw, Sparkles } from "lucide-react"
import { toast } from "sonner"

import { TransactionForm } from "@/components/transactions/transaction-form"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { useTransaction } from "@/hooks/use-transactions"
import { describeApiError, isApiError } from "@/lib/api/errors"
import { invalidateFinancialData } from "@/lib/api/invalidate"
import type { ApiTransaction } from "@/lib/api/schemas"
import { createTransaction, updateTransaction } from "@/lib/api/transactions"
import { todayIso } from "@/lib/format"
import { apiToCents } from "@/lib/money-input"
import { transactionLabel } from "@/lib/transaction-label"
import { paths } from "@/routes/paths"

/** Lançamento novo, ou o id do lançamento a editar. */
export type TransactionDialogTarget =
  { kind: "new" } | { kind: "edit"; id: string }

/**
 * Cadastro e edição no mesmo modal e no mesmo formulário: com um lançamento
 * vindo do backend é edição; sem ele, o formulário começa vazio e é cadastro.
 */
export function TransactionDialog({
  target,
  onClose,
}: {
  target: TransactionDialogTarget | null
  onClose: () => void
}) {
  const [dirty, setDirty] = useState(false)
  const [confirmingDiscard, setConfirmingDiscard] = useState(false)

  const close = useCallback(() => {
    setDirty(false)
    setConfirmingDiscard(false)
    onClose()
  }, [onClose])

  // Esc e clique fora fecham um modal sem querer com facilidade; numa página
  // isso não acontecia. Com alterações não salvas, pergunta antes.
  function requestClose() {
    if (dirty) setConfirmingDiscard(true)
    else close()
  }

  const editing = target?.kind === "edit"

  return (
    <>
      <Dialog
        open={target !== null}
        onOpenChange={(open) => !open && requestClose()}
      >
        <DialogContent className="max-h-[calc(100svh-2rem)] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Editar lançamento" : "Novo lançamento"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Corrija os dados da receita ou despesa. A descrição é opcional."
                : "Registre uma receita ou despesa. A descrição é opcional."}
            </DialogDescription>
          </DialogHeader>

          {target?.kind === "edit" ? (
            <EditContent
              key={target.id}
              id={target.id}
              onDone={close}
              onCancel={requestClose}
              onDirtyChange={setDirty}
            />
          ) : target?.kind === "new" ? (
            <>
              <TransactionEditor
                onDone={close}
                onCancel={requestClose}
                onDirtyChange={setDirty}
              />
              <p className="text-ai-accent flex items-center gap-2 text-xs">
                <Sparkles className="size-3.5" aria-hidden="true" />
                <span>
                  Também dá para registrar conversando:{" "}
                  <Link
                    to={paths.app.assistant}
                    className="underline underline-offset-3"
                  >
                    abrir o assistente
                  </Link>
                </span>
              </p>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmingDiscard} onOpenChange={setConfirmingDiscard}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar alterações?</AlertDialogTitle>
            <AlertDialogDescription>
              O que você preencheu neste lançamento ainda não foi salvo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar editando</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={close}>
              Descartar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

type EditorCallbacks = {
  onDone: () => void
  onCancel: () => void
  onDirtyChange: (dirty: boolean) => void
}

/** Busca o lançamento ao abrir, para editar o que está persistido. */
function EditContent({ id, ...callbacks }: { id: string } & EditorCallbacks) {
  const query = useTransaction(id)

  if (query.isPending) {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label="Carregando lançamento"
        className="space-y-4"
      >
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    )
  }

  if (query.isError) {
    // 404 não melhora com nova tentativa: o lançamento não existe, foi
    // excluído ou não é deste usuário, e o backend não distingue os três.
    const notFound = isApiError(query.error) && query.error.statusCode === 404

    return (
      <Alert variant="destructive">
        <CircleAlert />
        <AlertTitle>Não foi possível abrir o lançamento</AlertTitle>
        <AlertDescription className="space-y-3">
          <p>{describeApiError(query.error)}</p>
          {notFound ? null : (
            <Button
              variant="outline"
              className="h-8"
              onClick={() => void query.refetch()}
              disabled={query.isFetching}
            >
              <RefreshCw />
              Tentar novamente
            </Button>
          )}
        </AlertDescription>
      </Alert>
    )
  }

  return <TransactionEditor item={query.data} {...callbacks} />
}

function TransactionEditor({
  item,
  onDone,
  onCancel,
  onDirtyChange,
}: { item?: ApiTransaction } & EditorCallbacks) {
  const queryClient = useQueryClient()

  // Calculada ao abrir, e não na carga do módulo: numa sessão aberta durante a
  // virada do dia, a data padrão ficaria presa no dia anterior.
  const defaultValues = useMemo(
    () =>
      item
        ? {
            type: item.type,
            amountCents: apiToCents(item.amount),
            categoryId: item.categoryId,
            date: item.date,
            description: item.description ?? "",
          }
        : {
            type: "despesa" as const,
            // Declarado mesmo vazio: o React Hook Form compara os valores
            // atuais com estes chave a chave, e um campo ausente aqui faz o
            // formulário intocado parecer alterado.
            amountCents: null,
            categoryId: "",
            date: todayIso(),
            description: "",
          },
    [item],
  )

  return (
    <TransactionForm
      defaultValues={defaultValues}
      save={(input) =>
        item ? updateTransaction(item.id, input) : createTransaction(input)
      }
      onSaved={async (salvo) => {
        await invalidateFinancialData(queryClient)
        toast.success(item ? "Lançamento atualizado" : "Lançamento salvo", {
          description: transactionLabel(salvo),
        })
        onDone()
      }}
      onCancel={onCancel}
      onDirtyChange={onDirtyChange}
      submitLabel={item ? "Salvar alterações" : "Salvar"}
      errorTitle={
        item
          ? "Não foi possível salvar as alterações"
          : "Não foi possível salvar o lançamento"
      }
    />
  )
}
