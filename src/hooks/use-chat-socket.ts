import { useCallback, useEffect, useRef, useState } from "react"
import { io, type Socket } from "socket.io-client"

import { refreshSession } from "@/lib/api/auth-session"
import { getAccessToken } from "@/lib/api/auth-token"
import { markSessionExpired } from "@/lib/api/session-store"
import {
  ACK_TIMEOUT,
  CONNECTION_LOST,
  ChatEvent,
  NOT_CONNECTED,
  SESSION_EXPIRED,
  socketUrl,
  type ChatFailure,
  type ReplyChunk,
  type CancelOperationAck,
  type PendingSummary,
  type ReplyEnd,
  type ReplyError,
  type SendMessageAck,
  type SendMessagePayload,
} from "@/lib/chat/protocol"
import { apiBaseUrl } from "@/lib/env"

export type ChatConnection = "conectando" | "conectado" | "desconectado"

export type ReplyHandlers = {
  onChunk: (text: string) => void
  onEnd: (pending: PendingSummary | null) => void
  onError: (failure: ChatFailure) => void
}

const ACK_TIMEOUT_MS = 10_000
const RECONNECT_TIMEOUT_MS = 10_000

/**
 * Conexão com o gateway do chat enquanto o componente estiver montado.
 *
 * O token vai no `auth` como função: o Socket.IO a chama a cada tentativa, e
 * assim uma reconexão depois da renovação apresenta o token novo.
 */
export function useChatSocket() {
  const [status, setStatus] = useState<ChatConnection>("conectando")
  const socketRef = useRef<Socket | null>(null)
  const handlers = useRef(new Map<string, ReplyHandlers>())

  const renewAndReconnect = useCallback(async (socket: Socket) => {
    if (await refreshSession()) {
      socket.connect()
      return true
    }
    markSessionExpired()
    setStatus("desconectado")
    return false
  }, [])

  useEffect(() => {
    const socket = io(socketUrl(apiBaseUrl), {
      path: "/socket.io",
      transports: ["websocket"],
      autoConnect: false,
      auth: (callback) => callback({ token: getAccessToken() }),
    })
    socketRef.current = socket
    let renewed = false

    const fail = (id: string, failure: ChatFailure) => {
      const reply = handlers.current.get(id)
      handlers.current.delete(id)
      reply?.onError(failure)
    }

    socket.on("connect", () => {
      renewed = false
      setStatus("conectado")
    })
    socket.on("disconnect", () => {
      setStatus(socket.active ? "conectando" : "desconectado")
      for (const id of [...handlers.current.keys()]) fail(id, CONNECTION_LOST)
    })
    socket.on(
      "connect_error",
      (error: Error & { data?: { code?: string } }) => {
        // `active` continua verdadeiro em falha de rede: o próprio cliente tenta
        // de novo. Recusa do servidor desliga as novas tentativas.
        if (socket.active) {
          setStatus("conectando")
          return
        }
        if (error.data?.code === "sessao_expirada" && !renewed) {
          renewed = true
          void renewAndReconnect(socket)
          return
        }
        setStatus("desconectado")
      },
    )

    socket.on(ChatEvent.chunk, ({ id, text }: ReplyChunk) =>
      handlers.current.get(id)?.onChunk(text),
    )
    socket.on(ChatEvent.end, ({ id, pending }: ReplyEnd) => {
      const reply = handlers.current.get(id)
      handlers.current.delete(id)
      reply?.onEnd(pending ?? null)
    })
    socket.on(ChatEvent.error, ({ id, code, message }: ReplyError) =>
      fail(id, { code, message }),
    )

    socket.connect()

    return () => {
      socket.removeAllListeners()
      socket.disconnect()
      socketRef.current = null
    }
  }, [renewAndReconnect])

  const send = useCallback(async function send(
    payload: SendMessagePayload,
    reply: ReplyHandlers,
    isRetry = false,
  ): Promise<ChatFailure | null> {
    const socket = socketRef.current
    if (!socket?.connected) return NOT_CONNECTED

    // Antes do envio: o primeiro pedaço pode chegar junto com a confirmação.
    handlers.current.set(payload.id, reply)

    let ack: SendMessageAck
    try {
      ack = (await socket
        .timeout(ACK_TIMEOUT_MS)
        .emitWithAck(ChatEvent.send, payload)) as SendMessageAck
    } catch {
      handlers.current.delete(payload.id)
      return ACK_TIMEOUT
    }

    if (ack.ok) return null
    handlers.current.delete(payload.id)

    if (ack.code === "sessao_expirada" && !isRetry) {
      if (!(await refreshSession())) {
        markSessionExpired()
        return SESSION_EXPIRED
      }
      // O token do socket é o do handshake; renovar exige reconectar.
      socket.disconnect()
      setStatus("conectando")
      socket.connect()
      if (!(await connected(socket))) return NOT_CONNECTED
      return send(payload, reply, true)
    }

    return { code: ack.code, message: ack.message }
  }, [])

  const cancel = useCallback((id: string) => {
    socketRef.current?.emit(ChatEvent.cancel, { id })
  }, [])

  /** Descarta o lançamento em andamento; devolve a resposta do assistente. */
  const cancelOperation = useCallback(
    async (conversationId: string): Promise<string | ChatFailure> => {
      const socket = socketRef.current
      if (!socket?.connected) return NOT_CONNECTED
      try {
        const ack = (await socket
          .timeout(ACK_TIMEOUT_MS)
          .emitWithAck(ChatEvent.cancelOperation, {
            conversationId,
          })) as CancelOperationAck
        return ack.ok ? ack.reply : { code: ack.code, message: ack.message }
      } catch {
        return ACK_TIMEOUT
      }
    },
    [],
  )

  const reconnect = useCallback(() => {
    setStatus("conectando")
    socketRef.current?.connect()
  }, [])

  return { status, send, cancel, cancelOperation, reconnect }
}

function connected(socket: Socket): Promise<boolean> {
  if (socket.connected) return Promise.resolve(true)

  return new Promise((resolve) => {
    const timer = setTimeout(() => finish(false), RECONNECT_TIMEOUT_MS)
    const onConnect = () => finish(true)
    const onError = () => {
      if (!socket.active) finish(false)
    }
    function finish(ok: boolean) {
      clearTimeout(timer)
      socket.off("connect", onConnect)
      socket.off("connect_error", onError)
      resolve(ok)
    }
    socket.on("connect", onConnect)
    socket.on("connect_error", onError)
  })
}
