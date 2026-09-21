import { z } from "zod"

import { apiGet, apiRequest, apiPost } from "@/lib/api/client"
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

export type UpdateProfileInput = {
  name?: string
  email?: string
  /** Exigida pelo backend quando o e-mail muda. */
  currentPassword?: string
}

export type ChangePasswordInput = {
  currentPassword: string
  newPassword: string
}

/** Perfil atual, direto do servidor. */
export function getMe(signal?: AbortSignal): Promise<User> {
  return apiGet("/auth/me", userSchema, { signal })
}

export function updateProfile(
  input: UpdateProfileInput,
  signal?: AbortSignal,
): Promise<User> {
  return apiRequest("/users/me", {
    schema: userSchema,
    method: "PATCH",
    body: input,
    signal,
  })
}

/** Encerra as demais sessões do usuário como efeito colateral, por decisão do backend. */
export function changePassword(
  input: ChangePasswordInput,
  signal?: AbortSignal,
): Promise<null> {
  return apiRequest("/users/me/password", {
    schema: z.null(),
    method: "PUT",
    body: input,
    signal,
  })
}
