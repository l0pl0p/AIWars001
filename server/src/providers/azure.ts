import { config, isAzureConfigured } from '../config';
import type {
  ChatProvider,
  ModelsResult,
  LoadModelResult,
  ChatParams,
  ChatResult,
  StreamCallbacks,
} from './types';

export const azureProvider: ChatProvider = {
  name: 'azure',

  async listModels(): Promise<ModelsResult> {
    if (!isAzureConfigured()) {
      return {
        models: [],
        error: 'Azure OpenAI is not configured. Set AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, and AZURE_OPENAI_DEPLOYMENT in your .env file.',
      };
    }
    return {
      models: [{ id: config.azure.deployment, name: config.azure.deployment }],
    };
  },

  async loadModel(_modelId: string): Promise<LoadModelResult> {
    if (!isAzureConfigured()) {
      return { success: false, error: 'Azure OpenAI is not configured.' };
    }
    // Azure OpenAI models are always loaded — no-op
    return { success: true };
  },

  async chat(params: ChatParams): Promise<ChatResult> {
    if (!isAzureConfigured()) {
      return {
        content: '',
        error: 'Azure OpenAI is not configured. Set AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, and AZURE_OPENAI_DEPLOYMENT in your .env file.',
      };
    }

    const { endpoint, apiKey, deployment, apiVersion } = config.azure;
    const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

    const messages = [];
    if (params.systemPrompt) {
      messages.push({ role: 'system', content: params.systemPrompt });
    }
    for (const msg of params.messages) {
      messages.push({ role: msg.role, content: msg.content });
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 60000);

      let res: Response;
      try {
        res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': apiKey,
          },
          body: JSON.stringify({
            messages,
            temperature: params.temperature ?? 0.7,
            stream: false,
          }),
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }

      if (!res.ok) {
        const text = await res.text();
        return { content: '', error: `Azure OpenAI error (${res.status}): ${text}` };
      }

      const data = await res.json() as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = data.choices?.[0]?.message?.content ?? '';
      if (!content) {
        return { content: '', error: 'Azure OpenAI returned an empty response.' };
      }
      return { content };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      if (msg.includes('abort')) {
        return { content: '', error: 'Request timed out.' };
      }
      return { content: '', error: `Azure OpenAI request failed: ${msg}` };
    }
  },

  async chatStream(params: ChatParams, callbacks: StreamCallbacks): Promise<void> {
    const { onChunk, onDone, onError } = callbacks;

    if (!isAzureConfigured()) {
      onError('Azure OpenAI is not configured. Set AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, and AZURE_OPENAI_DEPLOYMENT in your .env file.');
      return;
    }

    const { endpoint, apiKey, deployment, apiVersion } = config.azure;
    const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

    const messages = [];
    if (params.systemPrompt) {
      messages.push({ role: 'system', content: params.systemPrompt });
    }
    for (const msg of params.messages) {
      messages.push({ role: msg.role, content: msg.content });
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 120000);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey,
        },
        body: JSON.stringify({
          messages,
          temperature: params.temperature ?? 0.7,
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        onError(`Azure OpenAI error (${res.status}): ${text}`);
        return;
      }

      if (!res.body) {
        onError('Azure OpenAI returned no response body.');
        return;
      }

      const reader = res.body.getReader();
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
          if (!trimmed || !trimmed.startsWith('data:')) continue;
          const data = trimmed.slice(5).trim();
          if (data === '[DONE]') {
            onDone();
            return;
          }
          try {
            const parsed = JSON.parse(data) as {
              choices?: Array<{ delta?: { content?: string }; finish_reason?: string }>;
            };
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              onChunk(delta);
            }
            if (parsed.choices?.[0]?.finish_reason === 'stop') {
              onDone();
              return;
            }
          } catch {
            // Skip malformed lines
          }
        }
      }

      onDone();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      if (msg.includes('abort')) {
        onError('Request timed out.');
      } else {
        onError(`Azure OpenAI streaming failed: ${msg}`);
      }
    } finally {
      clearTimeout(timer);
    }
  },
};
