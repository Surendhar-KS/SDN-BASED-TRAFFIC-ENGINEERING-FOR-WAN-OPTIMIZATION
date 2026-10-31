import type { AssistantChatRequest, AssistantChatResponse, AssistantConfirmationRequest } from './assistantTypes';
const resolveApiBaseUrl = (): string => {
  const resolved =
    (import.meta.env.VITE_API_BASE_URL as string | undefined) ||
    'http://127.0.0.1:5000/api';
  return resolved;
};

const API_BASE_URL = resolveApiBaseUrl();

async function postJson<T>(endpoint: string, body: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload?.reply || `Assistant API request failed (${response.status}).`);
  }

  return response.json() as Promise<T>;
}

export const assistantService = {
  sendChat: (payload: AssistantChatRequest) =>
    postJson<AssistantChatResponse>('/assistant/chat', payload),
  confirmAction: (payload: AssistantConfirmationRequest) =>
    postJson<AssistantChatResponse>('/assistant/confirm', payload),
};
