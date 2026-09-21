import { useEffect } from "react"
import { Navigate, Outlet, useLocation } from "react-router-dom"

import { useSession } from "@/hooks/use-session"
import { restoreSession } from "@/lib/api/auth-session"
import { paths } from "@/routes/paths"

/**
 * Envolve as rotas privadas. Enquanto a sessão é verificada exibe um estado de
 * carregamento; sem sessão ativa, envia o usuário para o login guardando a rota
 * pretendida para retomar o fluxo depois da autenticação.
 */
export function ProtectedRoute() {
  const { isAuthenticated, isLoading } = useSession()
  const location = useLocation()

  // Recarregar a página perde o access token, que vive só em memória; o cookie
  // de refresh o recupera antes de decidir se há sessão.
  useEffect(() => {
    void restoreSession()
  }, [])

  if (isLoading) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex min-h-svh items-center justify-center text-sm text-muted-foreground"
      >
        Verificando sua sessão...
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <Navigate to={paths.public.login} state={{ from: location }} replace />
    )
  }

  return <Outlet />
}
