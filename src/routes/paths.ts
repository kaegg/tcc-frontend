/**
 * Rotas da aplicação em um único lugar, para evitar strings soltas espalhadas
 * pelos componentes de navegação.
 */
export const paths = {
  public: {
    login: "/login",
    register: "/cadastro",
    forgotPassword: "/recuperar-senha",
  },
  app: {
    dashboard: "/dashboard",
    transactions: "/lancamentos",
    newTransaction: "/lancamentos/novo",
    editTransaction: "/lancamentos/:id/editar",
    reports: "/relatorios",
    assistant: "/assistente",
    profile: "/perfil",
    settings: "/configuracoes",
  },
} as const

/** O id é opaco e vai codificado, como nas chamadas à API. */
export const editTransactionPath = (id: string) =>
  `/lancamentos/${encodeURIComponent(id)}/editar`
