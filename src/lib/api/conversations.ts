import { apiGet } from "@/lib/api/client"
import {
  conversationDetailSchema,
  conversationListSchema,
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
