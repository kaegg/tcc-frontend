import { apiPost } from "@/lib/api/client"
import { userSchema, type User } from "@/lib/api/schemas"

export type CreateUserInput = {
  name: string
  email: string
  password: string
}

/**
 * Cria a conta.
 */
export function createUser(
  input: CreateUserInput,
  signal?: AbortSignal,
): Promise<User> {
  return apiPost("/users", input, userSchema, { signal })
}
