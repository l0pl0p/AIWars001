import { useState, useRef, useEffect } from 'react';
import type { User } from '../../types';

interface UserSwitcherProps {
  users: User[];
  activeUser: User | null;
  onCreateUser: (name: string) => void;
  onRenameUser: (id: string, name: string) => void;
  onDeleteUser: (id: string) => void;
  onSelectUser: (user: User) => void;
}

export default function UserSwitcher({
  users,
  activeUser,
  onCreateUser,
  onRenameUser,
  onDeleteUser,
  onSelectUser,
}: UserSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (creating && inputRef.current) inputRef.current.focus();
  }, [creating]);

  function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    onCreateUser(name);
    setNewName('');
    setCreating(false);
    setOpen(false);
  }

  function handleStartEdit(user: User) {
    setEditingId(user.id);
    setEditName(user.name);
    setOpen(false);
  }

  function handleSaveEdit(id: string) {
    const name = editName.trim();
    if (name) onRenameUser(id, name);
    setEditingId(null);
  }

  const initials = (name: string) =>
    name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="user-switcher" ref={dropdownRef}>
      {editingId ? (
        <div className="user-switcher__edit">
          <input
            className="user-switcher__edit-input"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSaveEdit(editingId);
              if (e.key === 'Escape') setEditingId(null);
            }}
            autoFocus
          />
          <button className="user-switcher__edit-save" onClick={() => handleSaveEdit(editingId)}>
            Save
          </button>
        </div>
      ) : (
        <button className="user-switcher__trigger" onClick={() => setOpen(!open)}>
          {activeUser ? (
            <>
              <div className="user-switcher__avatar">
                {initials(activeUser.name)}
              </div>
              <span className="user-switcher__name">{activeUser.name}</span>
            </>
          ) : (
            <span className="user-switcher__placeholder">Select user</span>
          )}
          <svg className="user-switcher__chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      )}

      {open && (
        <div className="user-switcher__dropdown">
          {users.map((user) => (
            <div key={user.id} className={`user-switcher__item${user.id === activeUser?.id ? ' user-switcher__item--active' : ''}`}>
              <button
                className="user-switcher__item-btn"
                onClick={() => { onSelectUser(user); setOpen(false); }}
              >
                <div className="user-switcher__item-avatar">{initials(user.name)}</div>
                <span>{user.name}</span>
              </button>
              <div className="user-switcher__item-actions">
                <button
                  className="user-switcher__action-btn"
                  onClick={(e) => { e.stopPropagation(); handleStartEdit(user); }}
                  title="Rename"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                  </svg>
                </button>
                <button
                  className="user-switcher__action-btn user-switcher__action-btn--danger"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm(`Delete user "${user.name}"? All their conversations will be lost.`)) {
                      onDeleteUser(user.id);
                      setOpen(false);
                    }
                  }}
                  title="Delete"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6l-1 14H6L5 6" />
                    <path d="M10 11v6M14 11v6" />
                    <path d="M9 6V4h6v2" />
                  </svg>
                </button>
              </div>
            </div>
          ))}

          <div className="user-switcher__separator" />

          {creating ? (
            <div className="user-switcher__new">
              <input
                ref={inputRef}
                className="user-switcher__new-input"
                placeholder="Enter name..."
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCreate();
                  if (e.key === 'Escape') { setCreating(false); setNewName(''); }
                }}
              />
              <button className="user-switcher__new-confirm" onClick={handleCreate}>
                Add
              </button>
            </div>
          ) : (
            <button
              className="user-switcher__add-btn"
              onClick={() => setCreating(true)}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New user
            </button>
          )}
        </div>
      )}

      <style>{`
        .user-switcher { position: relative; }
        .user-switcher__trigger {
          display: flex; align-items: center; gap: 8px;
          width: 100%; padding: 8px 10px;
          background: var(--color-surface); border: 1px solid var(--color-border);
          border-radius: var(--radius-md); cursor: pointer;
          transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
          color: var(--color-text-primary);
        }
        .user-switcher__trigger:hover { border-color: var(--color-border-strong); box-shadow: var(--shadow-xs); }
        .user-switcher__avatar {
          width: 26px; height: 26px; border-radius: 50%;
          background: var(--color-accent); color: white;
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 600; flex-shrink: 0;
        }
        .user-switcher__name { flex: 1; text-align: left; font-size: 14px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .user-switcher__placeholder { flex: 1; text-align: left; font-size: 14px; color: var(--color-text-tertiary); }
        .user-switcher__chevron { color: var(--color-text-tertiary); flex-shrink: 0; }
        .user-switcher__dropdown {
          position: absolute; top: calc(100% + 6px); left: 0; right: 0;
          background: var(--color-surface); border: 1px solid var(--color-border);
          border-radius: var(--radius-lg); box-shadow: var(--shadow-md);
          overflow: hidden; z-index: 100;
          animation: dropdownIn 0.12s ease;
        }
        @keyframes dropdownIn { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
        .user-switcher__item { display: flex; align-items: center; }
        .user-switcher__item--active .user-switcher__item-btn { background: var(--color-accent-light); }
        .user-switcher__item-btn {
          flex: 1; display: flex; align-items: center; gap: 8px;
          padding: 9px 12px; text-align: left; font-size: 14px;
          color: var(--color-text-primary); transition: background var(--transition-fast);
        }
        .user-switcher__item-btn:hover { background: var(--color-surface-secondary); }
        .user-switcher__item-avatar {
          width: 22px; height: 22px; border-radius: 50%;
          background: var(--color-accent); color: white;
          display: flex; align-items: center; justify-content: center;
          font-size: 10px; font-weight: 600; flex-shrink: 0;
        }
        .user-switcher__item-actions { display: flex; gap: 2px; padding-right: 6px; opacity: 0; transition: opacity var(--transition-fast); }
        .user-switcher__item:hover .user-switcher__item-actions { opacity: 1; }
        .user-switcher__action-btn {
          display: flex; align-items: center; justify-content: center;
          width: 24px; height: 24px; border-radius: var(--radius-sm);
          color: var(--color-text-tertiary); transition: background var(--transition-fast), color var(--transition-fast);
        }
        .user-switcher__action-btn:hover { background: var(--color-surface-tertiary); color: var(--color-text-secondary); }
        .user-switcher__action-btn--danger:hover { background: var(--color-danger-light); color: var(--color-danger); }
        .user-switcher__separator { height: 1px; background: var(--color-border); margin: 4px 0; }
        .user-switcher__add-btn {
          display: flex; align-items: center; gap: 8px;
          width: 100%; padding: 9px 12px; font-size: 13px;
          color: var(--color-accent); transition: background var(--transition-fast);
        }
        .user-switcher__add-btn:hover { background: var(--color-accent-light); }
        .user-switcher__new {
          display: flex; gap: 6px; padding: 8px 10px; align-items: center;
        }
        .user-switcher__new-input {
          flex: 1; padding: 5px 8px; border: 1px solid var(--color-border);
          border-radius: var(--radius-sm); font-size: 13px;
          background: var(--color-surface);
        }
        .user-switcher__new-input:focus { border-color: var(--color-accent); }
        .user-switcher__new-confirm {
          padding: 5px 10px; background: var(--color-accent); color: white;
          border-radius: var(--radius-sm); font-size: 12px; font-weight: 500;
          transition: background var(--transition-fast);
        }
        .user-switcher__new-confirm:hover { background: var(--color-accent-hover); }
        .user-switcher__edit { display: flex; gap: 6px; align-items: center; }
        .user-switcher__edit-input {
          flex: 1; padding: 7px 10px; border: 1px solid var(--color-accent);
          border-radius: var(--radius-md); font-size: 14px;
          background: var(--color-surface);
        }
        .user-switcher__edit-save {
          padding: 7px 12px; background: var(--color-accent); color: white;
          border-radius: var(--radius-md); font-size: 13px; font-weight: 500;
          flex-shrink: 0; transition: background var(--transition-fast);
        }
        .user-switcher__edit-save:hover { background: var(--color-accent-hover); }
      `}</style>
    </div>
  );
}
