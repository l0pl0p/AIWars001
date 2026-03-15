export interface ModelInfo {
  id: string;
  name: string;
  loaded?: boolean;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatParams {
  messages: ChatMessage[];
  model: string;
  temperature?: number;
  systemPrompt?: string;
  signal?: AbortSignal;
}

export interface ChatResult {
  content: string;
  error?: string;
}

export interface ModelsResult {
  models: ModelInfo[];
  error?: string;
}

export interface LoadModelResult {
  success: boolean;
  error?: string;
}

export interface StreamCallbacks {
  onChunk: (chunk: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}

export interface ChatProvider {
  name: string;
  listModels(): Promise<ModelsResult>;
  loadModel(modelId: string): Promise<LoadModelResult>;
  chat(params: ChatParams): Promise<ChatResult>;
  chatStream(params: ChatParams, callbacks: StreamCallbacks): Promise<void>;
}
