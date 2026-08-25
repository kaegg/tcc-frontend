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
    reports: "/relatorios",
    assistant: "/assistente",
    profile: "/perfil",
    settings: "/configuracoes",
  },
} as const
