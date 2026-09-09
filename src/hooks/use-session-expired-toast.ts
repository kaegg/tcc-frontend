import { useEffect } from "react"
import { toast } from "sonner"

import { SESSION_EXPIRED_MESSAGE } from "@/lib/api/messages"
import { useSessionExpired } from "@/lib/api/session-store"

/**
 * Avisa uma única vez que a sessão expirou.
 */
export function useSessionExpiredToast(): void {
  const expired = useSessionExpired()

  useEffect(() => {
    if (!expired) return

    toast.error(SESSION_EXPIRED_MESSAGE, { id: "sessao-expirada" })
  }, [expired])
}
