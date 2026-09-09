import { QueryClient } from "@tanstack/react-query"

import { isApiError } from "@/lib/api/errors"

/** Quantas vezes repetir uma falha que pode melhorar sozinha. */
const MAX_RETRIES = 2

/**
 * Cache das consultas à API.
 *
 * Criado no escopo do módulo, e não dentro do componente: instanciado a cada
 * render, o cache seria descartado junto e as telas ficariam presas em
 * carregamento, refazendo as mesmas requisições sem parar.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Categorias e afins mudam raramente; sem isto, cada navegação entre
      // telas dispara uma requisição nova só para receber o mesmo dado (RNF04).
      staleTime: 5 * 60_000,
      gcTime: 30 * 60_000,

      retry: (failureCount, error) => {
        // Repetir 400, 401 ou 404 é tráfego jogado fora: a resposta não muda
        // por insistência, e no caso do 401 ainda multiplica o aviso na tela.
        if (isApiError(error) && !error.isRetryable) return false
        return failureCount < MAX_RETRIES
      },
      // O padrão do TanStack chega a 30 segundos de espera. Numa interface cujo
      // tempo de tarefa é cronometrado no estudo, isso é tempo morto medido.
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 5000),

      // A avaliação de usabilidade cronometra tarefas. Uma busca disparada só
      // porque o participante voltou o foco para a janela trocaria a tela sob
      // ele no meio da tarefa e contaminaria a medição.
      refetchOnWindowFocus: false,
      // Recuperar a conexão é o "tentar novamente" que o RNF10 pede, de graça.
      refetchOnReconnect: true,
    },
    mutations: {
      // Escrita não é idempotente enquanto não houver chave de idempotência:
      // repetir sozinho pode duplicar lançamento.
      retry: false,
    },
  },
})
