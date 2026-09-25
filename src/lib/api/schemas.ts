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
  fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
})

export const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  createdAt: z.string(),
})

/**
 * Lançamento. Dinheiro é string decimal de duas casas e data civil é
 * `AAAA-MM-DD` (ADR 0002): nenhum dos dois passa por `number` nem `Date`.
 */
export const transactionSchema = z.object({
  id: z.string(),
  type: transactionTypeSchema,
  amount: z.string(),
  date: z.string(),
  description: z.string(),
  categoryId: z.string(),
  categoryName: z.string(),
  source: z.enum(["formulario", "assistente"]),
  createdAt: z.string(),
  updatedAt: z.string(),
})

/** Coleção paginada: `data` mais `meta` (ADR 0002, convenção 5). */
export const transactionListSchema = z.object({
  data: z.array(transactionSchema),
  meta: z.object({
    page: z.number(),
    pageSize: z.number(),
    total: z.number(),
    totalPages: z.number(),
  }),
})

/** Decimal com duas casas; só o saldo pode vir negativo. */
const moneySchema = z.string().regex(/^-?\d+\.\d{2}$/)

/** Totais de um período (TCC-016). Saldo = receitas − despesas, do backend. */
export const periodSummarySchema = z.object({
  from: z.string(),
  to: z.string(),
  income: moneySchema,
  expense: moneySchema,
  balance: moneySchema,
  transactionCount: z.number().int().nonnegative(),
})

/**
 * Resposta de login e de refresh. O refresh token não aparece aqui de
 * propósito: ele viaja só em cookie httpOnly, que o JavaScript não lê.
 */
export const authSchema = z.object({
  accessToken: z.string(),
  tokenType: z.literal("Bearer"),
  expiresIn: z.number(),
  user: userSchema,
})

export type TransactionType = z.infer<typeof transactionTypeSchema>
export type ApiTransaction = z.infer<typeof transactionSchema>
export type TransactionList = z.infer<typeof transactionListSchema>
export type PeriodSummary = z.infer<typeof periodSummarySchema>
export type AuthResponse = z.infer<typeof authSchema>
export type Category = z.infer<typeof categorySchema>
export type CategoryList = z.infer<typeof categoryListSchema>
export type Health = z.infer<typeof healthSchema>
export type ApiErrorBody = z.infer<typeof apiErrorBodySchema>
export type User = z.infer<typeof userSchema>

/** Mensagens de erro agrupadas pelo campo que as produziu. */
export type FieldErrors = NonNullable<ApiErrorBody["fieldErrors"]>
