import type { User, Thread, Message, ModelInfo, AppSettings, StreamCallbacks, StreamEvent } from '../types';

const BASE = '/api';

// For SSE streaming: bypass Vite's proxy (which buffers chunked responses via gzip compression).
// Connect directly to Express so the browser receives SSE chunks without buffering.
// The server has CORS configured to allow http://localhost:5173.
const STREAM_BASE = 'http://localhost:3001/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || `Request failed: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  users: {
    list: () => request<User[]>('/users'),
    create: (name: string) =>
      request<User>('/users', { method: 'POST', body: JSON.stringify({ name }) }),
    rename: (id: string, name: string) =>
      request<User>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify({ name }) }),
    delete: (id: string) => request<void>(`/users/${id}`, { method: 'DELETE' }),
  },

  threads: {
    list: (userId: string) => request<Thread[]>(`/users/${userId}/threads`),
    create: (userId: string, title: string) =>
      request<Thread>(`/users/${userId}/threads`, {
        method: 'POST',
        body: JSON.stringify({ title }),
      }),
    update: (id: string, updates: Partial<Thread>) =>
      request<Thread>(`/threads/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      }),
    delete: (id: string) => request<void>(`/threads/${id}`, { method: 'DELETE' }),
  },

  messages: {
    list: (threadId: string) => request<Message[]>(`/threads/${threadId}/messages`),
  },

  chat: {
    // Non-streaming fallback
    send: (threadId: string, content: string) =>
      request<{
        userMessage: Message;
        assistantMessage: Message | null;
        error?: string;
      }>('/chat/send', {
        method: 'POST',
        body: JSON.stringify({ threadId, content }),
      }),

    // Streaming via SSE
    stream: (threadId: string, content: string, callbacks: StreamCallbacks): AbortController => {
      const controller = new AbortController();

      (async () => {
        try {
          const res = await fetch(`${STREAM_BASE}/chat/stream`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ threadId, content }),
            signal: controller.signal,
          });

          if (!res.ok) {
            const err = await res.json().catch(() => ({ error: res.statusText }));
            callbacks.onError(err.error || `Request failed: ${res.status}`);
            return;
          }

          if (!res.body) {
            callbacks.onError('No response body from server.');
            return;
          }

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          let accumulated = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() ?? '';

            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed.startsWith('data:')) continue;
              const raw = trimmed.slice(5).trim();
              if (!raw) continue;

              try {
                const event = JSON.parse(raw) as StreamEvent;

                if (event.type === 'user_message') {
                  callbacks.onUserMessage?.(event.message);
                } else if (event.type === 'token') {
                  accumulated += event.content;
                  callbacks.onToken(event.content, accumulated);
                } else if (event.type === 'done') {
                  callbacks.onDone(event.message);
                } else if (event.type === 'error') {
                  callbacks.onError(event.error);
                }
              } catch {
                // Skip malformed events
              }
            }
          }
        } catch (err: unknown) {
          if (err instanceof Error && err.name === 'AbortError') {
            // User cancelled — not an error
            return;
          }
          const msg = err instanceof Error ? err.message : 'Streaming failed';
          callbacks.onError(msg);
        }
      })();

      return controller;
    },
  },

  providers: {
    models: (provider: string) =>
      request<{ models: ModelInfo[]; error?: string }>(`/providers/models?provider=${provider}`),
    loadModel: (provider: string, modelId: string) =>
      request<{ success: boolean; error?: string }>('/providers/models/load', {
        method: 'POST',
        body: JSON.stringify({ provider, modelId }),
      }),
    status: () =>
      request<{ azure: { configured: boolean }; lmstudio: { configured: boolean } }>(
        '/providers/status'
      ),
    getSettings: () => request<AppSettings>('/providers/settings'),
    updateSettings: (settings: Partial<AppSettings>) =>
      request<AppSettings>('/providers/settings', {
        method: 'PATCH',
        body: JSON.stringify(settings),
      }),
  },
};
