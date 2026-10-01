import { useEffect } from "react"
import { Navigate, Outlet, useLocation } from "react-router-dom"

import { useSession } from "@/hooks/use-session"
import { restoreSession } from "@/lib/api/auth-session"
import { afterLoginPath } from "@/routes/after-login"
import { SessionCheck } from "@/routes/session-check"

/**
 * Envolve login e cadastro, o inverso do ProtectedRoute: com sessão ativa não
 * há o que fazer nessas telas, e o usuário segue para onde entraria depois de
 * autenticar.
 */
export function GuestRoute() {
  const { isAuthenticated, isLoading } = useSession()
  const location = useLocation()

  // Quem abre /login com o cookie de refresh válido já tem sessão; ela só não
  // foi restaurada ainda, porque o access token vive em memória.
  useEffect(() => {
    void restoreSession()
  }, [])

  if (isLoading) return <SessionCheck />

  if (isAuthenticated) {
    return <Navigate to={afterLoginPath(location.state)} replace />
  }

  return <Outlet />
}
