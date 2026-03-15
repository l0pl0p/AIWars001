import { describe, it, expect, beforeEach, vi } from 'vitest';

// Reset env vars before each test
const originalEnv = { ...process.env };

beforeEach(() => {
  // Clear Azure env vars
  delete process.env.AZURE_OPENAI_ENDPOINT;
  delete process.env.AZURE_OPENAI_API_KEY;
  delete process.env.AZURE_OPENAI_DEPLOYMENT;
  // Reset module registry to force re-evaluation of config
  vi.resetModules();
});

afterEach(() => {
  process.env = { ...originalEnv };
});

describe('Azure OpenAI provider — not configured', () => {
  it('listModels returns error when Azure is not configured', async () => {
    const { azureProvider } = await import('../../server/src/providers/azure');
    const result = await azureProvider.listModels();
    expect(result.models).toHaveLength(0);
    expect(result.error).toContain('not configured');
  });

  it('loadModel returns failure when Azure is not configured', async () => {
    const { azureProvider } = await import('../../server/src/providers/azure');
    const result = await azureProvider.loadModel('gpt-4');
    expect(result.success).toBe(false);
    expect(result.error).toContain('not configured');
  });

  it('chat returns error when Azure is not configured', async () => {
    const { azureProvider } = await import('../../server/src/providers/azure');
    const result = await azureProvider.chat({
      messages: [{ role: 'user', content: 'Hello' }],
      model: 'gpt-4',
    });
    expect(result.content).toBe('');
    expect(result.error).toContain('not configured');
  });
});

describe('Azure OpenAI provider — configured', () => {
  it('listModels returns deployment as model when configured', async () => {
    process.env.AZURE_OPENAI_ENDPOINT = 'https://test.openai.azure.com';
    process.env.AZURE_OPENAI_API_KEY = 'test-key';
    process.env.AZURE_OPENAI_DEPLOYMENT = 'gpt-4-deployment';
    vi.resetModules();

    const { azureProvider } = await import('../../server/src/providers/azure');
    const result = await azureProvider.listModels();
    expect(result.models).toHaveLength(1);
    expect(result.models[0].id).toBe('gpt-4-deployment');
    expect(result.error).toBeUndefined();
  });

  it('loadModel returns success when configured (no-op)', async () => {
    process.env.AZURE_OPENAI_ENDPOINT = 'https://test.openai.azure.com';
    process.env.AZURE_OPENAI_API_KEY = 'test-key';
    process.env.AZURE_OPENAI_DEPLOYMENT = 'gpt-4-deployment';
    vi.resetModules();

    const { azureProvider } = await import('../../server/src/providers/azure');
    const result = await azureProvider.loadModel('gpt-4-deployment');
    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  });
});
