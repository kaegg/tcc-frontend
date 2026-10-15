import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"

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
import { deleteConversation } from "@/lib/api/conversations"
import { describeApiError, isApiError } from "@/lib/api/errors"
import { queryKeys } from "@/lib/api/query-keys"
import type { ConversationSummary } from "@/lib/api/schemas"
import type { Conversation } from "@/lib/types"

/**
 * A exclusão é definitiva: a requisição só parte do botão deste diálogo.
 * Conversa que nunca chegou ao servidor sai só da tela.
 */
export function DeleteConversationDialog({
  conversation,
  onClose,
  onDeleted,
}: {
  conversation: Conversation | null
  onClose: () => void
  onDeleted: (id: string) => void
}) {
  const queryClient = useQueryClient()

  const excluir = useMutation({
    mutationFn: async (alvo: Conversation) => {
      if (!alvo.saved) return
      try {
        await deleteConversation(alvo.id)
      } catch (erro) {
        // Já excluída em outra aba: o objetivo foi alcançado.
        if (!(isApiError(erro) && erro.statusCode === 404)) throw erro
      }
    },
    onSuccess: (_, alvo) => {
      queryClient.removeQueries({ queryKey: queryKeys.conversation(alvo.id) })
      // Tira da lista já, sem esperar o refetch trazer a versão sem ela.
      queryClient.setQueryData<ConversationSummary[]>(
        queryKeys.conversations,
        (lista) => lista?.filter((item) => item.id !== alvo.id),
      )
      void queryClient.invalidateQueries({
        queryKey: queryKeys.conversations,
        exact: true,
      })
      toast.success("Conversa excluída", { description: alvo.title })
      onDeleted(alvo.id)
      fechar()
    },
    onError: (erro) => {
      toast.error("Não foi possível excluir a conversa", {
        description: describeApiError(erro),
      })
    },
  })

  function fechar() {
    excluir.reset()
    onClose()
  }

  return (
    <AlertDialog
      open={conversation !== null}
      onOpenChange={(open) => {
        if (!open && !excluir.isPending) fechar()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <Trash2 />
          </AlertDialogMedia>
          <AlertDialogTitle>Excluir conversa?</AlertDialogTitle>
          <AlertDialogDescription>
            <span className="block font-medium break-words text-foreground">
              “{conversation?.title}”
            </span>
            As mensagens são apagadas e não podem ser recuperadas. Um lançamento
            ainda não confirmado nesta conversa é descartado; os já registrados
            continuam em Lançamentos.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={excluir.isPending}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={excluir.isPending || conversation === null}
            onClick={() => conversation && excluir.mutate(conversation)}
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
