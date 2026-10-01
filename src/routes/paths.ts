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
    reports: "/relatorios",
    assistant: "/assistente",
    profile: "/perfil",
  },
} as const

/**
 * Cadastro e edição são modais da tela de lançamentos, abertos pela URL: o
 * botão Voltar fecha o modal, e a lista por trás mantém filtros e página.
 */
export const TRANSACTION_DIALOG_PARAMS = {
  new: "novo",
  edit: "editar",
} as const

export const newTransactionHref = `${paths.app.transactions}?${TRANSACTION_DIALOG_PARAMS.new}=1`
