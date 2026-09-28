import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { signOut } from "@/lib/api/auth-session"
import { paths } from "@/routes/paths"

/**
 * Sair de verdade: revoga a sessão no servidor antes de ir ao login. Só
 * navegar para `/login` deixaria o cookie de refresh válido, e a sessão
 * voltaria sozinha no próximo acesso a uma rota privada.
 */
export function useSignOut() {
  const navigate = useNavigate()

  return async function signOutAndLeave() {
    const confirmed = await signOut()

    if (!confirmed) {
      toast.warning("Não foi possível confirmar o encerramento no servidor", {
        description:
          "Você saiu deste navegador, mas a sessão pode continuar ativa. Tente sair novamente quando a conexão voltar.",
      })
    }

    navigate(paths.public.login, { replace: true })
  }
}
