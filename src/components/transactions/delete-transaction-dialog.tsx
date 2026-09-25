import { useMutation, useQueryClient } from "@tanstack/react-query"
import { CircleAlert, Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { TransactionTypeBadge } from "@/components/app/transaction-type-badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { describeApiError, isApiError } from "@/lib/api/errors"
import { queryKeys } from "@/lib/api/query-keys"
import type { ApiTransaction } from "@/lib/api/schemas"
import { deleteTransaction } from "@/lib/api/transactions"
import { formatCurrency, formatDate } from "@/lib/format"

/**
 * Confirmação explícita antes de excluir (RF09, RN05). A requisição só parte
 * do botão "Excluir" deste diálogo; nenhum outro caminho da interface chama
 * `deleteTransaction`.
 */
export function DeleteTransactionDialog({
  item,
  onClose,
  onDeleted,
}: {
  item: ApiTransaction | null
  onClose: () => void
  onDeleted?: (item: ApiTransaction) => void
}) {
  const queryClient = useQueryClient()

  const excluir = useMutation({
    mutationFn: (alvo: ApiTransaction) => deleteTransaction(alvo.id),
    onSuccess: async (_, alvo) => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.transactionsAll,
      })
      toast.success("Lançamento excluído", { description: alvo.description })
      onDeleted?.(alvo)
      fechar()
    },
    onError: async (erro) => {
      // Já excluído em outra aba, ou não é mais deste usuário: o objetivo foi
      // alcançado, e a lista precisa parar de mostrá-lo.
      if (isApiError(erro) && erro.statusCode === 404) {
        await queryClient.invalidateQueries({
          queryKey: queryKeys.transactionsAll,
        })
        toast.info("Este lançamento já havia sido excluído.")
        fechar()
      }
    },
  })

  function fechar() {
    excluir.reset()
    onClose()
  }

  return (
    <AlertDialog
      open={item !== null}
      onOpenChange={(open) => {
        // Fechar no meio da requisição esconderia o resultado dela.
        if (!open && !excluir.isPending) fechar()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <Trash2 />
          </AlertDialogMedia>
          <AlertDialogTitle>Excluir lançamento?</AlertDialogTitle>
          <AlertDialogDescription>
            Ele deixa de aparecer na listagem e nos relatórios.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {item ? (
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 rounded-lg bg-muted/50 p-3 text-sm">
            <dt className="text-muted-foreground">Descrição</dt>
            <dd className="break-words">{item.description}</dd>
            <dt className="text-muted-foreground">Valor</dt>
            <dd className="financial-value flex items-center gap-2">
              {formatCurrency(Number(item.amount))}
              <TransactionTypeBadge type={item.type} />
            </dd>
            <dt className="text-muted-foreground">Data</dt>
            <dd className="financial-value">{formatDate(item.date)}</dd>
          </dl>
        ) : null}

        {excluir.isError &&
        !(isApiError(excluir.error) && excluir.error.statusCode === 404) ? (
          <Alert variant="destructive">
            <CircleAlert />
            <AlertDescription>
              {describeApiError(excluir.error)}
            </AlertDescription>
          </Alert>
        ) : null}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={excluir.isPending}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={excluir.isPending || item === null}
            onClick={() => item && excluir.mutate(item)}
          >
            {excluir.isPending ? (
              <>
                <Loader2 className="animate-spin" />
                Excluindo...
              </>
            ) : (
              "Excluir"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
