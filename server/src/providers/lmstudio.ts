import { config } from '../config';
import type {
  ChatProvider,
  ModelsResult,
  LoadModelResult,
  ChatParams,
  ChatResult,
  StreamCallbacks,
} from './types';

const BASE_URL = () => config.lmStudioBaseUrl;

async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

function buildMessages(params: ChatParams): Array<{ role: string; content: string }> {
  const messages: Array<{ role: string; content: string }> = [];
  if (params.systemPrompt) {
    messages.push({ role: 'system', content: params.systemPrompt });
  }
  for (const msg of params.messages) {
    messages.push({ role: msg.role, content: msg.content });
  }
  return messages;
}

export const lmStudioProvider: ChatProvider = {
  name: 'lmstudio',

  async listModels(): Promise<ModelsResult> {
    try {
      const res = await fetchWithTimeout(
        `${BASE_URL()}/v1/models`,
        { method: 'GET', headers: { 'Content-Type': 'application/json' } },
        5000
      );
      if (!res.ok) {
        return { models: [], error: `LM Studio returned status ${res.status}` };
      }
      const data = await res.json() as {
        data?: Array<{ id: string; object?: string }>;
        models?: Array<{ key: string; display_name?: string }>;
      };

      let models;
      if (Array.isArray(data.models) && data.models.length > 0) {
        models = data.models.map((m) => ({
          id: m.key,
          name: m.display_name || m.key,
        }));
      } else {
        models = (data.data || []).map((m) => ({
          id: m.id,
          name: m.id,
        }));
      }
      return { models };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      if (msg.includes('abort') || msg.includes('ECONNREFUSED') || msg.includes('fetch')) {
        return { models: [], error: 'LM Studio is not available. Make sure it is running on port 1234.' };
      }
      return { models: [], error: `Failed to connect to LM Studio: ${msg}` };
    }
  },

  async loadModel(modelId: string): Promise<LoadModelResult> {
    try {
      const res = await fetchWithTimeout(
        `${BASE_URL()}/v1/models/load`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model: modelId }),
        },
        30000
      );
      if (!res.ok) {
        const text = await res.text();
        return { success: false, error: `Failed to load model: ${text}` };
      }
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      return { success: false, error: `Failed to load model: ${msg}` };
    }
  },

  async chat(params: ChatParams): Promise<ChatResult> {
    try {
      const body = {
        model: params.model,
        messages: buildMessages(params),
        temperature: params.temperature ?? 0.7,
        stream: false,
      };

      const res = await fetchWithTimeout(
        `${BASE_URL()}/v1/chat/completions`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
        60000
      );

      if (!res.ok) {
        const text = await res.text();
        return { content: '', error: `LM Studio error (${res.status}): ${text}` };
      }

      const data = await res.json() as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content ?? '';
      if (!content) {
        return { content: '', error: 'LM Studio returned an empty response.' };
      }
      return { content };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      if (msg.includes('abort')) {
        return { content: '', error: 'Request timed out. The model may be taking too long.' };
      }
      return { content: '', error: `Failed to get response from LM Studio: ${msg}` };
    }
  },

  async chatStream(params: ChatParams, callbacks: StreamCallbacks): Promise<void> {
    const { onChunk, onDone, onError } = callbacks;

    if (params.signal?.aborted) {
      onError('Request was cancelled before it started.');
      return;
    }

    const bodyStr = JSON.stringify({
      model: params.model,
      messages: buildMessages(params),
      temperature: params.temperature ?? 0.7,
      stream: true,
    });

    const url = `${BASE_URL()}/v1/chat/completions`;

    // Own abort controller for the 2-minute hard timeout.
    const timeoutController = new AbortController();
    const timer = setTimeout(() => timeoutController.abort(), 120_000);

    // Forward client-abort into our timeout controller without passing the
    // client signal directly to fetch (avoids any race between the abort check
    // above and the actual fetch call).
    let clientAborted = false;
    const onClientAbort = () => {
      clientAborted = true;
      timeoutController.abort();
    };
    params.signal?.addEventListener('abort', onClientAbort, { once: true });

    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: bodyStr,
        signal: timeoutController.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        clearTimeout(timer);
        params.signal?.removeEventListener('abort', onClientAbort);
        onError(`LM Studio error (${res.status}): ${text}`);
        return;
      }

      if (!res.body) {
        clearTimeout(timer);
        params.signal?.removeEventListener('abort', onClientAbort);
        onError('LM Studio returned no response body.');
        return;
      }

      reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data:')) continue;
          const data = trimmed.slice(5).trim();

          if (data === '[DONE]') {
            clearTimeout(timer);
            params.signal?.removeEventListener('abort', onClientAbort);
            onDone();
            return;
          }

          try {
            const parsed = JSON.parse(data) as {
              choices?: Array<{ delta?: { content?: string }; finish_reason?: string | null }>;
            };
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) onChunk(delta);
            if (parsed.choices?.[0]?.finish_reason === 'stop') {
              clearTimeout(timer);
              params.signal?.removeEventListener('abort', onClientAbort);
              onDone();
              return;
            }
          } catch {
            // skip malformed SSE line
          }
        }
      }

      // Stream ended without an explicit [DONE] marker — still a valid completion.
      clearTimeout(timer);
      params.signal?.removeEventListener('abort', onClientAbort);
      onDone();
    } catch (err: unknown) {
      clearTimeout(timer);
      params.signal?.removeEventListener('abort', onClientAbort);

      if (clientAborted) {
        // Client disconnected — route already knows, no error needed
        return;
      }
      if (timeoutController.signal.aborted) {
        onError('The model took too long to respond (120s timeout).');
        return;
      }
      const msg = err instanceof Error ? err.message : String(err);
      onError(`Failed to connect to LM Studio: ${msg}`);
    } finally {
      if (reader) {
        try { reader.cancel(); } catch { /* ignore */ }
      }
    }
  },
};
