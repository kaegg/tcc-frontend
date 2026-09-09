import { z } from "zod"

/**
 * Contratos da API REST, validados em tempo de execução.
 *
 * Tipo do TypeScript some na compilação: se a resposta mudar de formato, uma
 * tela quebra em algum ponto distante, com "undefined is not a function". Aqui
 * o desencontro aparece na borda, com nome de campo, e vira uma falha tratável.
 *
 * Estes schemas são a fonte única: os tipos saem de `z.infer`, nunca o
 * contrário.
 *
 * Nenhum objeto usa `.strict()`, de propósito. `z.object` já descarta chave
 * desconhecida, então campo novo no backend não derruba o frontend — é o que
 * permite a API evoluir de forma aditiva sem release coordenado dos dois lados.
 */

/** Enum idêntico ao do PostgreSQL: minúsculo e em português, sem tradução. */
export const transactionTypeSchema = z.enum(["receita", "despesa"])

/**
 * O `id` é uma string opaca, e não um UUID validado.
 *
 * Foi exatamente o acoplamento ao formato do identificador — o protótipo
 * assumia um slug legível — que criou a divergência com o banco. O cliente não
 * constrói nem interpreta identificador: recebe, guarda e devolve.
 */
export const categorySchema = z.object({
  id: z.string(),
  name: z.string(),
  type: transactionTypeSchema,
})

/** Toda coleção da API vem embrulhada em `data`. */
export const categoryListSchema = z.object({
  data: z.array(categorySchema),
})

const dependencyStatusSchema = z.enum(["ok", "indisponivel"])

export const healthSchema = z.object({
  status: z.enum(["ok", "degradado"]),
  timestamp: z.string(),
  uptimeSeconds: z.number(),
  dependencies: z.object({
    database: z.object({
      status: dependencyStatusSchema,
      latencyMs: z.number().optional(),
    }),
  }),
})

/**
 * Formato único de erro da API.
 *
 * `message` chega como string ou como lista de strings — o `ValidationPipe` do
 * backend devolve uma mensagem por violação. O cliente normaliza os dois casos
 * para lista.
 */
export const apiErrorBodySchema = z.object({
  statusCode: z.number(),
  error: z.string(),
  message: z.union([z.string(), z.array(z.string())]),
  path: z.string(),
  timestamp: z.string(),
})

export type TransactionType = z.infer<typeof transactionTypeSchema>
export type Category = z.infer<typeof categorySchema>
export type CategoryList = z.infer<typeof categoryListSchema>
export type Health = z.infer<typeof healthSchema>
export type ApiErrorBody = z.infer<typeof apiErrorBodySchema>
