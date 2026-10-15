import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { renameConversation } from "@/lib/api/conversations"
import { describeApiError, isApiError } from "@/lib/api/errors"
import { queryKeys } from "@/lib/api/query-keys"
import type { ConversationSummary } from "@/lib/api/schemas"
import type { Conversation } from "@/lib/types"

/** Mesmo teto da coluna `conversations.title`. */
const MAX_TITLE_CHARS = 120

/** Conversa que nunca chegou ao servidor é renomeada só na tela. */
export function RenameConversationDialog({
  conversation,
  onClose,
  onRenamed,
}: {
  conversation: Conversation | null
  onClose: () => void
  onRenamed: (id: string, title: string) => void
}) {
  return (
    <Dialog
      open={conversation !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <DialogContent>
        {conversation && (
          // A chave recria o formulário com o nome de cada conversa aberta.
          <RenameForm
            key={conversation.id}
            conversation={conversation}
            onClose={onClose}
            onRenamed={onRenamed}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

function RenameForm({
  conversation,
  onClose,
  onRenamed,
}: {
  conversation: Conversation
  onClose: () => void
  onRenamed: (id: string, title: string) => void
}) {
  const queryClient = useQueryClient()
  const [title, setTitle] = useState(conversation.title)
  const [invalid, setInvalid] = useState<string | null>(null)

  const renomear = useMutation({
    mutationFn: async (novo: string) => {
      if (!conversation.saved) return novo
      return (await renameConversation(conversation.id, novo)).title
    },
    onSuccess: (novo) => {
      queryClient.setQueryData<ConversationSummary[]>(
        queryKeys.conversations,
        (lista) =>
          lista?.map((item) =>
            item.id === conversation.id ? { ...item, title: novo } : item,
          ),
      )
      void queryClient.invalidateQueries({
        queryKey: queryKeys.conversations,
        exact: true,
      })
      toast.success("Conversa renomeada")
      onRenamed(conversation.id, novo)
      onClose()
    },
    onError: (erro) => {
      const campo = isApiError(erro) ? erro.fieldErrors?.title?.[0] : undefined
      if (campo) setInvalid(campo)
      else
        toast.error("Não foi possível renomear a conversa", {
          description: describeApiError(erro),
        })
    },
  })

  function salvar() {
    const novo = title.replace(/\s+/g, " ").trim()
    if (!novo || novo.length > MAX_TITLE_CHARS) {
      setInvalid(`Informe um nome de 1 a ${MAX_TITLE_CHARS} caracteres.`)
      return
    }
    if (novo === conversation.title) {
      onClose()
      return
    }
    renomear.mutate(novo)
  }

  return (
    <form
      noValidate
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        salvar()
      }}
    >
      <DialogHeader>
        <DialogTitle>Renomear conversa</DialogTitle>
        <DialogDescription>
          O novo nome aparece em Conversas recentes.
        </DialogDescription>
      </DialogHeader>

      <Field data-invalid={invalid !== null}>
        <FieldLabel htmlFor="conversation-title">Nome</FieldLabel>
        <Input
          id="conversation-title"
          autoFocus
          className="h-10"
          value={title}
          maxLength={MAX_TITLE_CHARS}
          aria-invalid={invalid !== null}
          aria-describedby={invalid ? "conversation-title-error" : undefined}
          onChange={(event) => {
            setTitle(event.target.value)
            setInvalid(null)
          }}
        />
        {invalid && (
          <FieldError id="conversation-title-error">{invalid}</FieldError>
        )}
      </Field>

      <DialogFooter>
        <DialogClose
          render={<Button variant="outline" disabled={renomear.isPending} />}
        >
          Cancelar
        </DialogClose>
        <Button type="submit" disabled={renomear.isPending}>
          {renomear.isPending ? (
            <>
              <Loader2 className="animate-spin" />
              Salvando...
            </>
          ) : (
            "Salvar"
          )}
        </Button>
      </DialogFooter>
    </form>
  )
}
