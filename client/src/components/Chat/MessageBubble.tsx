import { useState } from 'react';
import type { Message } from '../../types';
import { parseThinking, estimateThinkingSeconds } from '../../utils/parseThinking';
import MarkdownContent from './MarkdownContent';

interface MessageBubbleProps {
  message: Message;
  /** When true, this is a live-streaming message still being built */
  isStreaming?: boolean;
}

function formatTime(isoString: string): string {
  const d = new Date(isoString);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function ThinkingBlockLive({ text }: { text: string }) {
  // Auto-scroll to bottom of thinking text as it arrives
  return (
    <div className="thinking-in-progress">
      <div className="thinking-in-progress__label">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
        Thinking…
      </div>
      <div className="thinking-in-progress__text">{text}</div>
    </div>
  );
}

function ThinkingBlockCollapsed({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const secs = estimateThinkingSeconds(text);
  const label = secs > 0 ? `Thought for ~${secs}s` : 'Thought process';

  return (
    <div className="thinking-block">
      <button
        className={`thinking-block__toggle ${open ? 'thinking-block__toggle--open' : ''}`}
        onClick={() => setOpen((v) => !v)}
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9.663 17h4.673M12 3v1m6.364 1.636-.707.707M21 12h-1M4 12H3m3.343-5.657-.707-.707m2.828 9.9a5 5 0 1 1 7.072 0l-.548.547A3.374 3.374 0 0 0 14 18.469V19a2 2 0 1 1-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
        <span className="thinking-block__toggle-label">{label}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open && (
        <div className="thinking-block__content">{text}</div>
      )}
    </div>
  );
}

export default function MessageBubble({ message, isStreaming }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <div className={`message-bubble-wrap ${isUser ? 'message-bubble-wrap--user' : 'message-bubble-wrap--assistant'}`}>
      <div className={`message-bubble ${isUser ? 'message-bubble--user' : 'message-bubble--assistant'}`}>
        <div className="message-bubble__content">
          {isUser ? (
            // User messages: plain text
            <span style={{ whiteSpace: 'pre-wrap', fontSize: 'var(--text-base)', lineHeight: '1.55' }}>
              {message.content}
            </span>
          ) : (
            // Assistant messages: parse thinking + render markdown
            <AssistantContent content={message.content} isStreaming={isStreaming} />
          )}
        </div>
        <div className="message-bubble__meta">
          <span className="message-bubble__time">{formatTime(message.created_at)}</span>
        </div>
      </div>

      <style>{`
        .message-bubble-wrap {
          display: flex;
          max-width: 80%;
        }
        .message-bubble-wrap--user {
          align-self: flex-end;
          margin-left: auto;
          max-width: 70%;
        }
        .message-bubble-wrap--assistant {
          align-self: flex-start;
          max-width: 85%;
        }
        .message-bubble {
          padding: 10px 14px;
          border-radius: var(--radius-xl);
          max-width: 100%;
          word-break: break-word;
        }
        .message-bubble--user {
          background: var(--color-user-bubble);
          color: var(--color-user-bubble-text);
          border-bottom-right-radius: 4px;
        }
        .message-bubble--assistant {
          background: var(--color-assistant-bubble);
          color: var(--color-assistant-bubble-text);
          border-bottom-left-radius: 4px;
        }
        .message-bubble__content {
          font-size: var(--text-base);
          line-height: 1.55;
        }
        .message-bubble__meta {
          display: flex;
          justify-content: flex-end;
          margin-top: 4px;
        }
        .message-bubble__time {
          font-size: var(--text-xs);
          opacity: 0.6;
        }
        .message-bubble--user .message-bubble__time {
          color: rgba(255,255,255,0.8);
        }
        .message-bubble--assistant .message-bubble__time {
          color: var(--color-text-tertiary);
        }
      `}</style>
    </div>
  );
}

function AssistantContent({ content, isStreaming }: { content: string; isStreaming?: boolean }) {
  const { thinking, response, isThinkingInProgress } = parseThinking(content);

  return (
    <>
      {/* Thinking block */}
      {thinking !== null && (
        isThinkingInProgress
          ? <ThinkingBlockLive text={thinking} />
          : <ThinkingBlockCollapsed text={thinking} />
      )}

      {/* Response content */}
      {isThinkingInProgress ? (
        // Still in thinking phase — show nothing yet for the response
        null
      ) : isStreaming ? (
        // Streaming response (not in thinking phase) — render plain text so
        // markdown doesn't flicker with partially-formed syntax
        <MarkdownContent content={response || content} plain />
      ) : (
        // Complete message — full markdown rendering
        <MarkdownContent content={response || content} />
      )}
    </>
  );
}
