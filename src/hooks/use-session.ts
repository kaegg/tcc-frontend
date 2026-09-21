import { useSessionState } from "@/lib/api/auth-session"
import { useSessionExpired } from "@/lib/api/session-store"
import type { User } from "@/lib/types"

/**
 * Estado da sessão do usuário.
 */
export type Session = {
  isAuthenticated: boolean
  isLoading: boolean
  user: User | null
}

export function useSession(): Session {
  const { status, user } = useSessionState()
  const expired = useSessionExpired()

  return {
    isAuthenticated: status === "authenticated" && !expired,
    isLoading: status === "loading",
    user,
  }
}

/**
 * Usuário da área privada. As rotas privadas só renderizam com sessão ativa
 * (ProtectedRoute), então a ausência aqui é erro de montagem, não de fluxo.
 */
export function useAuthenticatedUser(): User {
  const { user } = useSession()

  if (!user) throw new Error("useAuthenticatedUser fora de uma sessão ativa.")

  return user
}
