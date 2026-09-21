import { useSyncExternalStore } from "react"

import { clearAccessToken, setAccessToken } from "@/lib/api/auth-token"
import {
  login as loginRequest,
  logout as logoutRequest,
  refresh as refreshRequest,
  type LoginInput,
} from "@/lib/api/auth"
import { setRefreshHandler } from "@/lib/api/client"
import { queryClient } from "@/lib/api/query-client"
import type { AuthResponse } from "@/lib/api/schemas"
import { clearSessionExpired } from "@/lib/api/session-store"
import type { User } from "@/lib/types"

/**
 * Estado da sessão do usuário.
 *
 * `loading` só existe até a primeira tentativa de restaurar a sessão pelo
 * cookie: como o access token vive em memória, todo carregamento de página
 * começa sem ele.
 */
export type SessionStatus = "loading" | "authenticated" | "anonymous"

type SessionState = { status: SessionStatus; user: User | null }

let state: SessionState = { status: "loading", user: null }

const listeners = new Set<() => void>()

function setState(next: SessionState): void {
  state = next
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useSessionState(): SessionState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => state,
  )
}

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const first = parts[0]?.[0] ?? ""
  const last = parts.length > 1 ? (parts[parts.length - 1][0] ?? "") : ""

  return (first + last).toUpperCase()
}

function beginSession(auth: AuthResponse): void {
  setAccessToken(auth.accessToken)
  clearSessionExpired()
  setState({
    status: "authenticated",
    user: {
      name: auth.user.name,
      email: auth.user.email,
      initials: initialsOf(auth.user.name),
    },
  })
}

function endSession(): void {
  clearAccessToken()
  setState({ status: "anonymous", user: null })
}

export async function signIn(input: LoginInput): Promise<void> {
  // O cache pertence ao usuário anterior; sem limpar, dados dele apareceriam
  // para o próximo a entrar neste navegador.
  queryClient.clear()
  beginSession(await loginRequest(input))
}

/**
 * Encerra a sessão. Devolve `false` quando o servidor não confirmou: o
 * usuário sai da interface de qualquer forma, mas o cookie pode continuar
 * válido, e ele precisa saber disso.
 */
export async function signOut(): Promise<boolean> {
  let confirmed = true

  try {
    await logoutRequest()
  } catch {
    confirmed = false
  }

  endSession()
  queryClient.clear()
  return confirmed
}

let refreshInFlight: Promise<boolean> | null = null

/** Uma única renovação por vez; chamadas simultâneas compartilham o resultado. */
export function refreshSession(): Promise<boolean> {
  refreshInFlight ??= (async () => {
    try {
      beginSession(await refreshRequest())
      return true
    } catch {
      endSession()
      return false
    } finally {
      refreshInFlight = null
    }
  })()

  return refreshInFlight
}

/** Tenta restaurar a sessão pelo cookie, uma vez por carregamento da página. */
export function restoreSession(): Promise<boolean> {
  return state.status === "loading"
    ? refreshSession()
    : Promise.resolve(state.status === "authenticated")
}

setRefreshHandler(refreshSession)
