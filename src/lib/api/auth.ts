import { z } from "zod"

import { apiPost } from "@/lib/api/client"
import { authSchema, type AuthResponse } from "@/lib/api/schemas"

export type LoginInput = { email: string; password: string }

// `skipAuthHandling`: um 401 aqui é "credencial errada" ou "sem sessão", nunca
// "sessão expirada". Tratá-lo como expiração dispararia a renovação dentro da
// própria renovação.

export function login(
  input: LoginInput,
  signal?: AbortSignal,
): Promise<AuthResponse> {
  return apiPost("/auth/login", input, authSchema, {
    signal,
    skipAuthHandling: true,
  })
}

export function refresh(signal?: AbortSignal): Promise<AuthResponse> {
  return apiPost("/auth/refresh", undefined, authSchema, {
    signal,
    skipAuthHandling: true,
  })
}

export function logout(signal?: AbortSignal): Promise<null> {
  return apiPost("/auth/logout", undefined, z.null(), {
    signal,
    skipAuthHandling: true,
  })
}
