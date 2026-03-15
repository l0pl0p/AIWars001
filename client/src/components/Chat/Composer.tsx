import { useState, useRef, useEffect, type KeyboardEvent as ReactKeyboardEvent } from 'react';

interface ComposerProps {
  onSend: (content: string) => void;
  disabled: boolean;
  placeholder?: string;
}

export default function Composer({ onSend, disabled, placeholder = 'Message...' }: ComposerProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);

  function handleKeyDown(e: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleSend() {
    const content = value.trim();
    if (!content || disabled) return;
    onSend(content);
    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }

  const canSend = value.trim().length > 0 && !disabled;

  return (
    <div className={`composer${disabled ? ' composer--disabled' : ''}`}>
      <textarea
        ref={textareaRef}
        className="composer__input"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        aria-label="Message input"
      />
      <button
        className="composer__send"
        onClick={handleSend}
        disabled={!canSend}
        aria-label="Send message"
        title="Send (Enter)"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="22" y1="2" x2="11" y2="13" />
          <polygon points="22 2 15 22 11 13 2 9 22 2" />
        </svg>
      </button>

      <style>{`
        .composer {
          display: flex;
          align-items: flex-end;
          gap: var(--space-3);
          background: var(--color-surface);
          border: 1.5px solid var(--color-border-strong);
          border-radius: var(--radius-xl);
          padding: 10px 10px 10px 16px;
          transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
        }
        .composer:focus-within {
          border-color: var(--color-accent);
          box-shadow: 0 0 0 3px rgba(0,113,227,0.12);
        }
        .composer--disabled {
          opacity: 0.6;
        }
        .composer__input {
          flex: 1;
          border: none;
          background: transparent;
          resize: none;
          font-size: var(--text-base);
          line-height: 1.5;
          color: var(--color-text-primary);
          min-height: 24px;
          max-height: 200px;
          overflow-y: auto;
        }
        .composer__input::placeholder {
          color: var(--color-text-tertiary);
        }
        .composer__send {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 34px;
          height: 34px;
          border-radius: var(--radius-full);
          background: var(--color-accent);
          color: white;
          flex-shrink: 0;
          transition: background var(--transition-fast), opacity var(--transition-fast), transform var(--transition-fast);
        }
        .composer__send:hover:not(:disabled) {
          background: var(--color-accent-hover);
          transform: scale(1.05);
        }
        .composer__send:disabled {
          opacity: 0.35;
          cursor: not-allowed;
        }
      `}</style>
    </div>
  );
}
