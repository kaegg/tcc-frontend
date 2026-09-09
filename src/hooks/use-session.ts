import { demoUser } from "@/lib/demo-data"
import { useSessionExpired } from "@/lib/api/session-store"
import type { User } from "@/lib/types"

/**
 * Estado da sessão do usuário.
 */
export type Session = {
  isAuthenticated: boolean
  isLoading: boolean
  user: User
}

export function useSession(): Session {
  const expired = useSessionExpired()

  return { isAuthenticated: !expired, isLoading: false, user: demoUser }
}
