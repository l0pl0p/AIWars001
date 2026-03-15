import { useState } from 'react';
import type { Thread } from '../../types';

interface ThreadListProps {
  threads: Thread[];
  activeThread: Thread | null;
  onSelectThread: (thread: Thread) => void;
  onRenameThread: (id: string, title: string) => void;
  onDeleteThread: (id: string) => void;
}

export default function ThreadList({
  threads,
  activeThread,
  onSelectThread,
  onRenameThread,
  onDeleteThread,
}: ThreadListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  function startEdit(thread: Thread) {
    setEditingId(thread.id);
    setEditTitle(thread.title);
  }

  function saveEdit(id: string) {
    if (editTitle.trim()) onRenameThread(id, editTitle.trim());
    setEditingId(null);
  }

  if (threads.length === 0) {
    return (
      <div className="thread-list__empty">
        <div className="thread-list__empty-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <p>No conversations yet</p>
        <p className="thread-list__empty-hint">Click + to start one</p>
      </div>
    );
  }

  return (
    <div className="thread-list">
      {threads.map((thread) => (
        <div
          key={thread.id}
          className={`thread-item${thread.id === activeThread?.id ? ' thread-item--active' : ''}`}
        >
          {editingId === thread.id ? (
            <input
              className="thread-item__edit-input"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveEdit(thread.id);
                if (e.key === 'Escape') setEditingId(null);
              }}
              onBlur={() => saveEdit(thread.id)}
              autoFocus
            />
          ) : (
            <>
              <button
                className="thread-item__btn"
                onClick={() => onSelectThread(thread)}
              >
                <span className="thread-item__title">{thread.title}</span>
                <span className="thread-item__provider-badge">
                  {thread.provider === 'azure' ? 'AZ' : 'LM'}
                </span>
              </button>
              <div className="thread-item__actions">
                <button
                  className="thread-item__action"
                  onClick={(e) => { e.stopPropagation(); startEdit(thread); }}
                  title="Rename"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button
                  className="thread-item__action thread-item__action--danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete "${thread.title}"?`)) onDeleteThread(thread.id);
                  }}
                  title="Delete"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14H6L5 6" />
                    <path d="M9 6V4h6v2" />
                  </svg>
                </button>
              </div>
            </>
          )}
        </div>
      ))}

      <style>{`
        .thread-list { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 2px; }
        .thread-list__empty {
          flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 6px; padding: var(--space-6); text-align: center;
          color: var(--color-text-tertiary); font-size: var(--text-sm);
        }
        .thread-list__empty-icon { color: var(--color-text-tertiary); margin-bottom: 4px; }
        .thread-list__empty-hint { font-size: var(--text-xs); }
        .thread-item {
          display: flex; align-items: center; position: relative;
          border-radius: var(--radius-md); overflow: hidden;
        }
        .thread-item--active { background: var(--color-accent-light); }
        .thread-item:not(.thread-item--active):hover { background: var(--color-surface-tertiary); }
        .thread-item__btn {
          flex: 1; display: flex; align-items: center; justify-content: space-between; gap: 6px;
          padding: 8px 10px; text-align: left; min-width: 0;
          color: var(--color-text-primary);
        }
        .thread-item__title {
          font-size: var(--text-sm); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .thread-item--active .thread-item__title { color: var(--color-accent); font-weight: var(--font-medium); }
        .thread-item__provider-badge {
          font-size: 9px; font-weight: 600; padding: 1px 4px;
          border-radius: var(--radius-sm); background: var(--color-surface-tertiary);
          color: var(--color-text-tertiary); letter-spacing: 0.04em; flex-shrink: 0;
        }
        .thread-item--active .thread-item__provider-badge { background: rgba(0,113,227,0.1); color: var(--color-accent); }
        .thread-item__actions {
          display: flex; gap: 2px; padding-right: 6px; opacity: 0; transition: opacity var(--transition-fast);
        }
        .thread-item:hover .thread-item__actions { opacity: 1; }
        .thread-item__action {
          display: flex; align-items: center; justify-content: center; width: 22px; height: 22px;
          border-radius: var(--radius-sm); color: var(--color-text-tertiary);
          transition: background var(--transition-fast), color var(--transition-fast);
        }
        .thread-item__action:hover { background: var(--color-surface); color: var(--color-text-secondary); }
        .thread-item__action--danger:hover { background: var(--color-danger-light); color: var(--color-danger); }
        .thread-item__edit-input {
          flex: 1; margin: 4px 6px; padding: 4px 8px;
          border: 1px solid var(--color-accent); border-radius: var(--radius-sm);
          font-size: var(--text-sm); background: var(--color-surface);
        }
      `}</style>
    </div>
  );
}
