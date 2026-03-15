export interface User {
  id: string;
  name: string;
  created_at: string;
}

export interface Thread {
  id: string;
  user_id: string;
  title: string;
  provider: string;
  model: string | null;
  system_prompt: string | null;
  temperature: number;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  thread_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

export interface ModelInfo {
  id: string;
  name: string;
  loaded?: boolean;
}

export interface AppSettings {
  default_provider: string;
  default_temperature: string;
  lm_studio_model: string;
}

// Streaming SSE event types
export type StreamEvent =
  | { type: 'user_message'; message: Message }
  | { type: 'token'; content: string }
  | { type: 'done'; message: Message }
  | { type: 'error'; error: string };

export interface StreamCallbacks {
  onUserMessage?: (message: Message) => void;
  onToken: (token: string, accumulated: string) => void;
  onDone: (message: Message) => void;
  onError: (error: string) => void;
}
