import { useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  CircleAlert,
  MessageSquarePlus,
  RefreshCw,
  Send,
  Sparkles,
} from "lucide-react"
import { toast } from "sonner"

import { ProposalCard } from "@/components/app/proposal-card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { commandSuggestions, demoConversations } from "@/lib/demo-data"
import { formatDateTime } from "@/lib/format"
import { ASSISTANT_UNAVAILABLE_MESSAGE } from "@/lib/pending-backend"
import { cn } from "@/lib/utils"
import type { ChatMessage, Conversation } from "@/lib/types"
import { paths } from "@/routes/paths"

/** Resposta encenada do assistente. Enquanto o gateway Socket.IO e o Ollama não
 *  existem, o texto é digitado caractere a caractere para que
 *  o comportamento de streaming já esteja representado. */
const STAGED_REPLY =
  "Entendi que você quer registrar uma despesa. Separei os dados abaixo — confira antes de eu gravar."

export function AssistantPage() {
  const navigate = useNavigate()
  const [conversations, setConversations] = useState(demoConversations)
  const [activeId, setActiveId] = useState(demoConversations[0].id)
  const [draft, setDraft] = useState("")
  const [streaming, setStreaming] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const active =
    conversations.find((item) => item.id === activeId) ?? conversations[0]

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [active.messages.length, streaming])

  function updateActive(update: (conversation: Conversation) => Conversation) {
    setConversations((items) =>
      items.map((item) => (item.id === active.id ? update(item) : item)),
    )
  }

  function newConversation() {
    const conversation: Conversation = {
      id: `c${Date.now()}`,
      title: "Nova conversa",
      updatedAt: new Date().toISOString(),
      messages: [],
    }
    setConversations((items) => [conversation, ...items])
    setActiveId(conversation.id)
    setFailed(false)
  }

  async function send(text: string) {
    const content = text.trim()
    if (!content || streaming !== null) return

    setDraft("")
    setFailed(false)

    const userMessage: ChatMessage = {
      id: `m${Date.now()}`,
      role: "user",
      content,
    }
    updateActive((conversation) => ({
      ...conversation,
      title:
        conversation.messages.length === 0
          ? content.slice(0, 40)
          : conversation.title,
      updatedAt: new Date().toISOString(),
      messages: [...conversation.messages, userMessage],
    }))

    // Streaming encenado: um caractere por vez, como o token a token do modelo.
    setStreaming("")
    for (let i = 1; i <= STAGED_REPLY.length; i += 2) {
      await new Promise((resolve) => setTimeout(resolve, 14))
      setStreaming(STAGED_REPLY.slice(0, i))
    }

    const reply: ChatMessage = {
      id: `m${Date.now() + 1}`,
      role: "assistant",
      content: STAGED_REPLY,
      proposal: {
        type: "despesa",
        amount: 35,
        categoryId: "alimentacao",
        date: "2026-08-16",
        description: content,
      },
      proposalStatus: "pendente",
    }

    setStreaming(null)
    updateActive((conversation) => ({
      ...conversation,
      updatedAt: new Date().toISOString(),
      messages: [...conversation.messages, reply],
    }))
  }

  function resolveProposal(
    messageId: string,
    status: "confirmada" | "cancelada",
  ) {
    updateActive((conversation) => ({
      ...conversation,
      messages: conversation.messages.map((message) =>
        message.id === messageId
          ? { ...message, proposalStatus: status }
          : message,
      ),
    }))

    if (status === "confirmada") {
      toast.success("Lançamento registrado", {
        description:
          "A gravação real usará o mesmo serviço do formulário, no backend.",
      })
    }
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
          <ScrollArea ref={scrollRef} className="flex-1 px-4">
            {active.messages.length === 0 && streaming === null ? (
              <EmptyConversation onPick={send} />
            ) : (
              <div className="space-y-4 py-4">
                {active.messages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    onConfirm={() => resolveProposal(message.id, "confirmada")}
                    onCancel={() => resolveProposal(message.id, "cancelada")}
                    onEdit={() => navigate(paths.app.newTransaction)}
                  />
                ))}

                {streaming !== null && (
                  <div className="max-w-[85%]">
                    <AssistantLabel />
                    <div className="rounded-xl rounded-bl-sm bg-muted/60 px-3 py-2 text-sm">
                      <p aria-live="polite">
                        {streaming}
                        <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-ai-accent align-text-bottom" />
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          <Separator />

          <div className="space-y-3 p-4">
            {failed && (
              <Alert variant="destructive">
                <CircleAlert />
                <AlertTitle>Falha ao conectar com o assistente</AlertTitle>
                <AlertDescription className="space-y-3">
                  <p>{ASSISTANT_UNAVAILABLE_MESSAGE}</p>
                  <Button
                    variant="outline"
                    className="h-8"
                    onClick={() => setFailed(false)}
                  >
                    <RefreshCw />
                    Tentar novamente
                  </Button>
                </AlertDescription>
              </Alert>
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
                placeholder="Ex.: gastei R$ 35 com almoço hoje"
                aria-label="Mensagem para o assistente"
                className="max-h-32 min-h-10 resize-none"
              />
              <Button
                type="submit"
                size="icon-lg"
                aria-label="Enviar mensagem"
                disabled={draft.trim() === "" || streaming !== null}
              >
                <Send />
              </Button>
            </form>

            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Conteúdo gerado por IA. Confirme antes de registrar.
              </p>
              <Button
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => setFailed(true)}
              >
                Simular falha
              </Button>
            </div>
          </div>
        </Card>
      </div>
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
  onConfirm,
  onEdit,
  onCancel,
}: {
  message: ChatMessage
  onConfirm: () => void
  onEdit: () => void
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
        <p>{message.content}</p>
        <ProposalCard
          message={message}
          onConfirm={onConfirm}
          onEdit={onEdit}
          onCancel={onCancel}
        />
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
