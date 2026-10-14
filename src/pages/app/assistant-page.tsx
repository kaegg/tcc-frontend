import { useEffect, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import {
  CircleAlert,
  MessageSquarePlus,
  RefreshCw,
  Send,
  Sparkles,
  Square,
  X,
} from "lucide-react"

import { ProposalCard } from "@/components/app/proposal-card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { useChatSocket, type ChatConnection } from "@/hooks/use-chat-socket"
import { ApiError } from "@/lib/api/errors"
import { invalidateFinancialData } from "@/lib/api/invalidate"
import type { CreateTransactionInput } from "@/lib/api/transactions"
import {
  MAX_MESSAGE_CHARS,
  NOT_CONNECTED,
  type ChatFailure,
  type OperationOutcome,
  type PendingSummary,
  type Proposal,
} from "@/lib/chat/protocol"
import { commandSuggestions, demoConversations } from "@/lib/demo-data"
import { formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"
import type { ChatMessage, Conversation, ProposalStatus } from "@/lib/types"

type PendingReply = { id: string; conversationId: string; text: string }

type Failure = {
  title?: string
  message: string
  retry: { conversationId: string; content: string } | null
}

/** Cartões que ainda aguardavam confirmação e deixaram de valer. */
function settleProposals(
  messages: ChatMessage[],
  status: ProposalStatus,
  keepId: string | null = null,
): ChatMessage[] {
  return messages.map((message) =>
    message.proposalStatus === "pendente" && message.proposal?.id !== keepId
      ? { ...message, proposalStatus: status }
      : message,
  )
}

function settledStatus(
  summary: PendingSummary | null,
  outcome: OperationOutcome | null,
): ProposalStatus {
  if (outcome === "registrado") return "confirmada"
  if (outcome === "cancelado") return "cancelada"
  return summary ? "substituida" : "expirada"
}

const CONNECTION_LABEL: Record<ChatConnection, string> = {
  conectado: "Conectado ao assistente",
  conectando: "Conectando ao assistente…",
  desconectado: "Sem conexão com o assistente",
}

function newClientId(prefix: string) {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
}

export function AssistantPage() {
  const queryClient = useQueryClient()
  const chat = useChatSocket()
  const [conversations, setConversations] = useState(demoConversations)
  const [activeId, setActiveId] = useState(demoConversations[0].id)
  const [draft, setDraft] = useState("")
  const [pending, setPending] = useState<PendingReply | null>(null)
  const [failure, setFailure] = useState<Failure | null>(null)
  // Lançamento sendo preenchido em cada conversa, como o servidor informou no
  // fim da última resposta.
  const [operations, setOperations] = useState<
    Record<string, PendingSummary | null>
  >({})
  const [cancelling, setCancelling] = useState(false)
  const [confirming, setConfirming] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const active =
    conversations.find((item) => item.id === activeId) ?? conversations[0]
  const streaming = pending?.conversationId === active.id ? pending.text : null
  const operation = operations[active.id] ?? null

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [active.messages.length, streaming])

  // A resposta chega depois e pode pertencer a uma conversa que já não está
  // aberta; por isso as atualizações são pelo id, não pela conversa ativa.
  function updateConversation(
    id: string,
    update: (conversation: Conversation) => Conversation,
  ) {
    setConversations((items) =>
      items.map((item) => (item.id === id ? update(item) : item)),
    )
  }

  function appendMessage(conversationId: string, message: ChatMessage) {
    updateConversation(conversationId, (conversation) => ({
      ...conversation,
      title:
        conversation.messages.length === 0 && message.role === "user"
          ? message.content.slice(0, 40)
          : conversation.title,
      updatedAt: new Date().toISOString(),
      messages: [...conversation.messages, message],
    }))
  }

  function newConversation() {
    const conversation: Conversation = {
      id: newClientId("c"),
      title: "Nova conversa",
      updatedAt: new Date().toISOString(),
      messages: [],
    }
    setConversations((items) => [conversation, ...items])
    setActiveId(conversation.id)
    setFailure(null)
  }

  async function send(text: string, retryIn?: string) {
    const content = text.trim()
    if (!content || pending !== null) return

    const conversationId = retryIn ?? active.id
    const retry = { conversationId, content }

    if (chat.status !== "conectado") {
      setFailure({ message: NOT_CONNECTED.message, retry: null })
      return
    }

    setFailure(null)
    if (!retryIn) {
      setDraft("")
      appendMessage(conversationId, {
        id: newClientId("m"),
        role: "user",
        content,
      })
    }

    const id = newClientId("r")
    let reply = ""
    setPending({ id, conversationId, text: "" })

    const finish = (interrupted: boolean) => {
      setPending(null)
      if (!reply) return
      appendMessage(conversationId, {
        id,
        role: "assistant",
        content: reply,
        interrupted,
      })
    }

    // A proposta vai para a resposta que a trouxe; um cartão anterior que
    // deixou de valer diz por quê, para o usuário não confirmar dado velho.
    const end = (
      summary: PendingSummary | null,
      outcome: OperationOutcome | null,
    ) => {
      setPending(null)
      const proposal = summary?.proposal ?? null
      updateConversation(conversationId, (conversation) => {
        const shown = conversation.messages.some(
          (message) => proposal && message.proposal?.id === proposal.id,
        )
        const messages = settleProposals(
          conversation.messages,
          settledStatus(summary, outcome),
          proposal?.id ?? null,
        )
        if (!reply) return { ...conversation, messages }
        return {
          ...conversation,
          updatedAt: new Date().toISOString(),
          messages: [
            ...messages,
            {
              id,
              role: "assistant",
              content: reply,
              ...(proposal && !shown
                ? { proposal, proposalStatus: "pendente" as const }
                : {}),
            },
          ],
        }
      })
      setOperations((current) => ({ ...current, [conversationId]: summary }))
      if (outcome === "registrado") void invalidateFinancialData(queryClient)
    }

    const refused = await chat.send(
      { id, conversationId, content },
      {
        onChunk: (chunk) => {
          reply += chunk
          setPending((current) =>
            current?.id === id ? { ...current, text: reply } : current,
          )
        },
        onEnd: end,
        onError: (error) => {
          finish(true)
          if (error.code !== "cancelado") {
            setFailure({ message: error.message, retry })
          }
        },
      },
    )

    if (refused) {
      setPending(null)
      setFailure({ message: refused.message, retry })
    }
  }

  /** Encerra a operação na tela e registra a resposta do assistente. */
  function closeOperation(
    conversationId: string,
    status: ProposalStatus,
    reply: string,
  ) {
    setOperations((current) => ({ ...current, [conversationId]: null }))
    updateConversation(conversationId, (conversation) => ({
      ...conversation,
      messages: settleProposals(conversation.messages, status),
    }))
    appendMessage(conversationId, {
      id: newClientId("m"),
      role: "assistant",
      content: reply,
    })
  }

  /** Lançamento que o servidor já não tem: o cartão sai de circulação. */
  function operationFailed(
    conversationId: string,
    failure: ChatFailure,
    title: string,
  ) {
    if (failure.code === "operacao_inexistente") {
      setOperations((current) => ({ ...current, [conversationId]: null }))
      updateConversation(conversationId, (conversation) => ({
        ...conversation,
        messages: settleProposals(conversation.messages, "expirada"),
      }))
    }
    setFailure({ title, message: failure.message, retry: null })
  }

  async function cancelOperation() {
    const conversationId = active.id
    setCancelling(true)
    const result = await chat.cancelOperation(conversationId)
    setCancelling(false)

    if (!result.ok) {
      setFailure({
        title: "Não foi possível cancelar o lançamento",
        message: result.message,
        retry: null,
      })
      return
    }
    closeOperation(conversationId, "cancelada", result.reply)
  }

  async function confirmProposal(messageId: string, proposal: Proposal) {
    const conversationId = active.id
    setFailure(null)
    setConfirming(messageId)
    const result = await chat.confirmOperation(conversationId, proposal.id)
    setConfirming(null)

    if (!result.ok) {
      operationFailed(
        conversationId,
        result,
        "Não foi possível registrar o lançamento",
      )
      return
    }
    closeOperation(conversationId, "confirmada", result.reply)
    void invalidateFinancialData(queryClient)
  }

  /**
   * A falha volta ao formulário do cartão como `ApiError`, para ele marcar
   * cada campo reprovado como faz com a resposta da API REST.
   */
  async function editProposal(
    messageId: string,
    proposal: Proposal,
    input: CreateTransactionInput,
  ): Promise<Proposal> {
    const conversationId = active.id
    const result = await chat.editOperation(conversationId, proposal.id, input)
    const updated = result.ok ? result.pending.proposal : null

    if (!result.ok || !updated) {
      const failure = result.ok ? NOT_CONNECTED : result
      if (failure.code === "operacao_inexistente") {
        operationFailed(
          conversationId,
          failure,
          "Não foi possível salvar as alterações",
        )
      }
      throw new ApiError({
        kind: "http",
        message: failure.message,
        fieldErrors: failure.fieldErrors,
      })
    }

    updateConversation(conversationId, (conversation) => ({
      ...conversation,
      messages: conversation.messages.map((message) =>
        message.id === messageId
          ? { ...message, proposal: updated, proposalEdited: true }
          : message,
      ),
    }))
    setOperations((current) => ({
      ...current,
      [conversationId]: result.pending,
    }))
    return updated
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Assistente IA
          </h1>
          <p className="text-sm text-pretty text-muted-foreground">
            Registre lançamentos e consulte seus dados escrevendo em linguagem
            natural. As respostas são geradas por IA e nada é gravado sem sua
            confirmação.
          </p>
        </div>
        <Button variant="outline" className="h-9" onClick={newConversation}>
          <MessageSquarePlus />
          Nova conversa
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
        {/* Painel esquerdo: histórico de conversas */}
        <Card className="h-fit">
          <CardContent className="px-2">
            <h2 className="px-2 pb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Conversas recentes
            </h2>
            <ul className="space-y-1">
              {conversations.map((conversation) => (
                <li key={conversation.id}>
                  <button
                    type="button"
                    onClick={() => setActiveId(conversation.id)}
                    aria-current={
                      conversation.id === active.id ? "true" : undefined
                    }
                    className={cn(
                      "w-full rounded-lg px-2 py-2 text-left text-sm transition-colors focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none",
                      conversation.id === active.id
                        ? "bg-muted text-foreground"
                        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
                    )}
                  >
                    <span className="block truncate">{conversation.title}</span>
                    <span className="financial-value block text-xs text-muted-foreground">
                      {formatDateTime(conversation.updatedAt)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Painel direito: conversa */}
        <Card className="flex h-[32rem] flex-col">
          <ConnectionStatus status={chat.status} onReconnect={chat.reconnect} />
          <Separator />

          <ScrollArea ref={scrollRef} className="flex-1 px-4">
            {active.messages.length === 0 && streaming === null ? (
              <EmptyConversation onPick={(text) => void send(text)} />
            ) : (
              // `log` anuncia ao leitor de tela cada mensagem concluída. O
              // texto em geração fica fora do anúncio: mudaria a cada token.
              <div
                role="log"
                aria-live="polite"
                aria-relevant="additions"
                aria-label="Mensagens da conversa"
                className="space-y-4 py-4"
              >
                {active.messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    busy={pending !== null || cancelling || confirming !== null}
                    confirming={confirming === message.id}
                    onConfirm={(proposal) =>
                      void confirmProposal(message.id, proposal)
                    }
                    onCancel={() => void cancelOperation()}
                    onEdit={(proposal, input) =>
                      editProposal(message.id, proposal, input)
                    }
                  />
                ))}

                {streaming !== null && (
                  <div className="max-w-[85%]" aria-busy="true">
                    <AssistantLabel />
                    <div className="rounded-xl rounded-bl-sm bg-muted/60 px-3 py-2 text-sm">
                      <p className="whitespace-pre-wrap">
                        {streaming === "" ? (
                          <span className="text-muted-foreground">
                            Pensando…
                          </span>
                        ) : (
                          streaming
                        )}
                        <span
                          aria-hidden="true"
                          className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-ai-accent align-text-bottom"
                        />
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          <Separator />

          <div className="space-y-3 p-4">
            {failure && (
              <Alert variant="destructive">
                <CircleAlert />
                <AlertTitle>
                  {failure.title ?? "Não foi possível obter a resposta"}
                </AlertTitle>
                <AlertDescription className="space-y-3">
                  <p>{failure.message}</p>
                  {failure.retry && (
                    <Button
                      variant="outline"
                      className="h-8"
                      disabled={chat.status !== "conectado"}
                      onClick={() => {
                        const { content, conversationId } = failure.retry!
                        void send(content, conversationId)
                      }}
                    >
                      <RefreshCw />
                      Tentar novamente
                    </Button>
                  )}
                </AlertDescription>
              </Alert>
            )}

            {operation && (
              <OperationStatus
                operation={operation}
                disabled={pending !== null || cancelling || confirming !== null}
                onCancel={() => void cancelOperation()}
              />
            )}

            <form
              onSubmit={(event) => {
                event.preventDefault()
                void send(draft)
              }}
              className="flex items-end gap-2"
            >
              <Textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault()
                    void send(draft)
                  }
                }}
                rows={1}
                maxLength={MAX_MESSAGE_CHARS}
                placeholder="Ex.: gastei R$ 35 com almoço hoje"
                aria-label="Mensagem para o assistente"
                className="max-h-32 min-h-10 resize-none"
              />
              {pending ? (
                <Button
                  type="button"
                  size="icon-lg"
                  variant="outline"
                  aria-label="Parar resposta"
                  onClick={() => chat.cancel(pending.id)}
                >
                  <Square />
                </Button>
              ) : (
                <Button
                  type="submit"
                  size="icon-lg"
                  aria-label="Enviar mensagem"
                  disabled={draft.trim() === "" || chat.status !== "conectado"}
                >
                  <Send />
                </Button>
              )}
            </form>

            <p className="text-xs text-muted-foreground">
              Conteúdo gerado por IA. Confirme antes de registrar.
            </p>
          </div>
        </Card>
      </div>
    </div>
  )
}

/**
 * O usuário vê que há um lançamento esperando resposta e pode desistir dele
 * sem precisar saber que "cancelar" também funciona por texto.
 */
function OperationStatus({
  operation,
  disabled,
  onCancel,
}: {
  operation: PendingSummary
  disabled: boolean
  onCancel: () => void
}) {
  const detail = operation.ready
    ? "dados completos, confira antes de registrar"
    : `falta ${operation.missing.join(" e ")}`

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-ai/25 bg-ai/5 px-3 py-2">
      <p role="status" className="text-xs">
        <span className="font-medium text-ai-accent">
          Lançamento em andamento
        </span>
        <span className="text-muted-foreground"> · {detail}</span>
      </p>
      <Button
        variant="ghost"
        className="h-7 text-xs"
        disabled={disabled}
        onClick={onCancel}
      >
        <X />
        Cancelar lançamento
      </Button>
    </div>
  )
}

function ConnectionStatus({
  status,
  onReconnect,
}: {
  status: ChatConnection
  onReconnect: () => void
}) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 px-4 py-2">
      <p
        role="status"
        className="flex items-center gap-2 text-xs text-muted-foreground"
      >
        <span
          aria-hidden="true"
          className={cn(
            "size-2 rounded-full",
            status === "conectado" && "bg-success",
            status === "conectando" && "animate-pulse bg-muted-foreground",
            status === "desconectado" && "bg-destructive",
          )}
        />
        {CONNECTION_LABEL[status]}
      </p>
      {status === "desconectado" && (
        <Button variant="ghost" className="h-7 text-xs" onClick={onReconnect}>
          <RefreshCw />
          Reconectar
        </Button>
      )}
    </div>
  )
}

function AssistantLabel() {
  return (
    <span className="mb-1 flex items-center gap-1.5 text-xs font-medium text-ai-accent">
      <Sparkles className="size-3" aria-hidden="true" />
      Assistente
    </span>
  )
}

function MessageBubble({
  message,
  busy,
  confirming,
  onConfirm,
  onEdit,
  onCancel,
}: {
  message: ChatMessage
  busy: boolean
  confirming: boolean
  onConfirm: (proposal: Proposal) => void
  onEdit: (
    proposal: Proposal,
    input: CreateTransactionInput,
  ) => Promise<Proposal>
  onCancel: () => void
}) {
  if (message.role === "user") {
    return (
      <div className="ml-auto max-w-[85%]">
        <span className="mb-1 block text-right text-xs text-muted-foreground">
          Você
        </span>
        <p className="rounded-xl rounded-br-sm bg-primary/10 px-3 py-2 text-sm">
          {message.content}
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-[85%]">
      <AssistantLabel />
      <div className="rounded-xl rounded-bl-sm bg-muted/60 px-3 py-2 text-sm">
        <p className="whitespace-pre-wrap">{message.content}</p>
        {message.interrupted && (
          <p className="mt-1 text-xs text-muted-foreground">
            Resposta interrompida.
          </p>
        )}
        {message.proposal && (
          <ProposalCard
            message={message}
            busy={busy}
            confirming={confirming}
            onConfirm={() => onConfirm(message.proposal!)}
            onEdit={(input) => onEdit(message.proposal!, input)}
            onCancel={onCancel}
          />
        )}
      </div>
    </div>
  )
}

function EmptyConversation({ onPick }: { onPick: (text: string) => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 py-10 text-center">
      <span className="flex size-10 items-center justify-center rounded-xl bg-ai/10 text-ai-accent ring-1 ring-ai/20">
        <Sparkles className="size-5" />
      </span>
      <div className="space-y-1">
        <p className="font-heading text-base font-medium">
          Nenhuma conversa iniciada
        </p>
        <p className="text-sm text-muted-foreground">
          Escreva o que aconteceu ou comece por uma sugestão.
        </p>
      </div>
      <ul className="flex flex-wrap justify-center gap-2">
        {commandSuggestions.map((suggestion) => (
          <li key={suggestion}>
            <Button
              variant="outline"
              className="h-8 text-xs"
              onClick={() => onPick(suggestion)}
            >
              {suggestion}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}
