import { lmStudioProvider } from '../providers/lmstudio';
import { azureProvider } from '../providers/azure';
import type { ChatProvider, ChatParams, ChatResult, StreamCallbacks } from '../providers/types';

const providers: Record<string, ChatProvider> = {
  lmstudio: lmStudioProvider,
  azure: azureProvider,
};

export function getProvider(name: string): ChatProvider | null {
  return providers[name] ?? null;
}

export async function sendChat(
  providerName: string,
  params: ChatParams
): Promise<ChatResult> {
  const provider = getProvider(providerName);
  if (!provider) {
    return { content: '', error: `Unknown provider: ${providerName}` };
  }
  return provider.chat(params);
}

export async function sendChatStream(
  providerName: string,
  params: ChatParams,
  callbacks: StreamCallbacks
): Promise<void> {
  const provider = getProvider(providerName);
  if (!provider) {
    callbacks.onError(`Unknown provider: ${providerName}`);
    return;
  }
  return provider.chatStream(params, callbacks);
}
