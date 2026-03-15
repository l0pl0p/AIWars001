import type { RefObject } from 'react';
import type { Message } from '../../types';
import MessageBubble from './MessageBubble';

interface MessageListProps {
  messages: Message[];
  sending: boolean;
  bottomRef: RefObject<HTMLDivElement>;
  /** Partially-built streaming assistant message (content accumulates token by token) */
  streamingMessage?: Message | null;
}

export default function MessageList({ messages, sending, bottomRef, streamingMessage }: MessageListProps) {
  const visibleMessages = messages.filter((m) => m.role !== 'system');

  if (visibleMessages.length === 0 && !sending && !streamingMessage) {
    return (
      <div className="message-list message-list--empty">
        <div className="message-list__empty">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <p>Start the conversation</p>
          <p className="message-list__empty-hint">Type a message below to get started.</p>
        </div>

        <style>{`
          .message-list--empty { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 300px; }
          .message-list__empty { display: flex; flex-direction: column; align-items: center; gap: 10px; color: var(--color-text-tertiary); text-align: center; }
          .message-list__empty p { font-size: var(--text-sm); }
          .message-list__empty-hint { font-size: var(--text-xs) !important; }
        `}</style>
      </div>
    );
  }

  return (
    <div className="message-list">
      {visibleMessages.map((message) => (
        <MessageBubble key={message.id} message={message} />
      ))}

      {/* Live streaming message — replaces the three-dot animation */}
      {streamingMessage && (
        <MessageBubble
          key="streaming"
          message={streamingMessage}
          isStreaming
        />
      )}

      {/* Three-dot animation only when we're waiting for the first token
          (sending=true but no streaming content yet) */}
      {sending && !streamingMessage && (
        <div className="message-list__thinking">
          <div className="thinking-bubble">
            <span className="thinking-dot" />
            <span className="thinking-dot" />
            <span className="thinking-dot" />
          </div>
        </div>
      )}

      <div ref={bottomRef} className="message-list__bottom" />

      <style>{`
        .message-list { display: flex; flex-direction: column; gap: var(--space-4); padding-bottom: var(--space-6); }
        .message-list__thinking { display: flex; justify-content: flex-start; }
        .thinking-bubble {
          display: flex; align-items: center; gap: 5px;
          padding: 12px 16px; background: var(--color-assistant-bubble);
          border-radius: var(--radius-xl) var(--radius-xl) var(--radius-xl) 4px;
          max-width: 80px;
        }
        .thinking-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--color-text-tertiary);
          animation: blink 1.2s ease-in-out infinite;
        }
        .thinking-dot:nth-child(2) { animation-delay: 0.2s; }
        .thinking-dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes blink {
          0%, 80%, 100% { opacity: 0.3; transform: scale(1); }
          40% { opacity: 1; transform: scale(1.1); }
        }
        .message-list__bottom { height: var(--space-4); }
      `}</style>
    </div>
  );
}
