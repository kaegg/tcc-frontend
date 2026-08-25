import { demoUser } from "@/lib/demo-data"
import type { User } from "@/lib/types"

/**
 * Estado da sessão do usuário.
 *
 * Nesta etapa a sessão é sempre considerada ativa.
 * Nada aqui autentica de fato: quando o controle de acesso real
 * entrar, este hook passa a ler o token/sessão devolvido pelo backend e as
 * rotas protegidas voltam a barrar quem não estiver autenticado.
 */
export type Session = {
  isAuthenticated: boolean
  isLoading: boolean
  user: User
}

export function useSession(): Session {
  return { isAuthenticated: true, isLoading: false, user: demoUser }
}
