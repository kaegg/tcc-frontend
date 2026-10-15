import { z } from "zod"

import { apiGet, apiRequest } from "@/lib/api/client"
import {
  conversationDetailSchema,
  conversationListSchema,
  conversationSummarySchema,
  type ConversationDetail,
  type ConversationSummary,
} from "@/lib/api/schemas"

/** Conversas gravadas do usuário, da mais recente para a mais antiga. */
export async function fetchConversations(
  signal?: AbortSignal,
): Promise<ConversationSummary[]> {
  const response = await apiGet("/conversations", conversationListSchema, {
    signal,
  })
  return response.data
}

export function fetchConversation(
  id: string,
  signal?: AbortSignal,
): Promise<ConversationDetail> {
  return apiGet(
    `/conversations/${encodeURIComponent(id)}`,
    conversationDetailSchema,
    { signal },
  )
}

/** Exclusão definitiva, com as mensagens; responde 204. */
export function deleteConversation(
  id: string,
  signal?: AbortSignal,
): Promise<null> {
  return apiRequest(`/conversations/${encodeURIComponent(id)}`, {
    schema: z.null(),
    method: "DELETE",
    signal,
  })
}

export function renameConversation(
  id: string,
  title: string,
  signal?: AbortSignal,
): Promise<ConversationSummary> {
  return apiRequest(`/conversations/${encodeURIComponent(id)}`, {
    schema: conversationSummarySchema,
    method: "PATCH",
    body: { title },
    signal,
  })
}
