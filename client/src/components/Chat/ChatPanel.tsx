import { useState, useEffect, useRef, useCallback } from 'react';
import type { Thread, Message } from '../../types';
import { api } from '../../api/client';
import MessageList from './MessageList';
import Composer from './Composer';
import './ChatPanel.css';

interface ChatPanelProps {
  thread: Thread | null;
  onThreadUpdate: (thread: Thread) => void;
}

export default function ChatPanel({ thread, onThreadUpdate }: ChatPanelProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The live-streaming assistant message being built token by token
  const [streamingMessage, setStreamingMessage] = useState<Message | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const prevThreadId = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Load messages when thread changes
  useEffect(() => {
    if (!thread) {
      abortRef.current?.abort();
      abortRef.current = null;
      setMessages([]);
      setStreamingMessage(null);
      setSending(false);
      setError(null);
      prevThreadId.current = null;
      return;
    }
    if (thread.id === prevThreadId.current) return;
    // Cancel any in-flight request from the previous thread
    abortRef.current?.abort();
    abortRef.current = null;
    prevThreadId.current = thread.id;
    setLoading(true);
    setSending(false);
    setError(null);
    setStreamingMessage(null);
    api.messages.list(thread.id)
      .then(setMessages)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [thread]);

  // Auto-scroll on new messages or streaming content
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, sending, streamingMessage?.content]);

  // Abort any in-flight request when component unmounts
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  const handleSend = useCallback(async (content: string) => {
    if (!thread || sending) return;
    setError(null);
    setSending(true);
    setStreamingMessage(null);

    // Optimistically add user message to UI
    const tempUserMsg: Message = {
      id: `temp-${Date.now()}`,
      thread_id: thread.id,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    // Placeholder for streaming assistant message
    const streamingPlaceholder: Message = {
      id: 'streaming',
      thread_id: thread.id,
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
    };

    let firstToken = true;

    const controller = api.chat.stream(thread.id, content, {
      onUserMessage(realUserMessage) {
        // Replace optimistic message with real persisted one
        setMessages((prev) =>
          prev.map((m) => (m.id === tempUserMsg.id ? realUserMessage : m))
        );
      },

      onToken(_token, accumulated) {
        if (firstToken) {
          firstToken = false;
          // Show the streaming bubble on first token
          setStreamingMessage({ ...streamingPlaceholder, content: accumulated });
        } else {
          setStreamingMessage((prev) =>
            prev ? { ...prev, content: accumulated } : null
          );
        }
      },

      onDone(assistantMessage) {
        // Replace streaming placeholder with real persisted message
        setStreamingMessage(null);
        setMessages((prev) => [...prev, assistantMessage]);
        setSending(false);
      },

      onError(errMsg) {
        setStreamingMessage(null);
        setError(errMsg);
        // Remove optimistic user message on failure if server never confirmed it
        setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
        setSending(false);
      },
    });

    abortRef.current = controller;
  }, [thread, sending]);

  if (!thread) {
    return (
      <div className="chat-panel chat-panel--empty">
        <div className="chat-panel__empty-state">
          <div className="chat-panel__empty-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          </div>
          <h2>No conversation selected</h2>
          <p>Select a conversation from the sidebar or create a new one.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-panel">
      <div className="chat-panel__messages">
        {loading ? (
          <div className="chat-panel__loading">
            <div className="spinner" />
          </div>
        ) : (
          <MessageList
            messages={messages}
            sending={sending}
            bottomRef={bottomRef}
            streamingMessage={streamingMessage}
          />
        )}
      </div>

      {error && (
        <div className="chat-panel__error">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          {error}
          <button className="chat-panel__error-dismiss" onClick={() => setError(null)}>×</button>
        </div>
      )}

      <div className="chat-panel__composer">
        <Composer
          onSend={handleSend}
          disabled={sending || !thread}
          placeholder={
            !thread.model && thread.provider === 'lmstudio'
              ? 'Select a model in Settings first...'
              : 'Message...'
          }
        />
      </div>
    </div>
  );
}
