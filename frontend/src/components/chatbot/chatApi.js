const API_BASE = import.meta.env.VITE_CHATBOT_API_URL ?? 'http://localhost:3001';

export class ChatApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ChatApiError';
    this.status = status;
  }
}

export async function sendChatMessage(messages, { onChunk } = {}) {
  const response = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ChatApiError(body.error ?? `Request failed with status ${response.status}`, response.status);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value, { stream: true });
    if (text) onChunk?.(text);
  }
}
