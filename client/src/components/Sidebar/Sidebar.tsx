import { useState } from 'react';
import type { User, Thread } from '../../types';
import UserSwitcher from './UserSwitcher';
import ThreadList from './ThreadList';
import './Sidebar.css';

interface SidebarProps {
  users: User[];
  activeUser: User | null;
  threads: Thread[];
  activeThread: Thread | null;
  onCreateUser: (name: string) => void;
  onRenameUser: (id: string, name: string) => void;
  onDeleteUser: (id: string) => void;
  onSelectUser: (user: User) => void;
  onCreateThread: (title?: string) => void;
  onRenameThread: (id: string, title: string) => void;
  onDeleteThread: (id: string) => void;
  onSelectThread: (thread: Thread) => void;
}

export default function Sidebar({
  users,
  activeUser,
  threads,
  activeThread,
  onCreateUser,
  onRenameUser,
  onDeleteUser,
  onSelectUser,
  onCreateThread,
  onRenameThread,
  onDeleteThread,
  onSelectThread,
}: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside className={`sidebar${collapsed ? ' sidebar--collapsed' : ''}`}>
      <div className="sidebar__header">
        <div className="sidebar__logo">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          {!collapsed && <span>LLM Chat</span>}
        </div>
        <button
          className="sidebar__collapse-btn"
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {collapsed
              ? <path d="M9 18l6-6-6-6" />
              : <path d="M15 18l-6-6 6-6" />
            }
          </svg>
        </button>
      </div>

      {!collapsed && (
        <>
          <div className="sidebar__section">
            <UserSwitcher
              users={users}
              activeUser={activeUser}
              onCreateUser={onCreateUser}
              onRenameUser={onRenameUser}
              onDeleteUser={onDeleteUser}
              onSelectUser={onSelectUser}
            />
          </div>

          <div className="sidebar__divider" />

          <div className="sidebar__section sidebar__section--grow">
            <div className="sidebar__section-header">
              <span className="sidebar__section-label">Conversations</span>
              <button
                className="sidebar__new-btn"
                onClick={() => onCreateThread()}
                title="New conversation"
                disabled={!activeUser}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
            </div>

            <ThreadList
              threads={threads}
              activeThread={activeThread}
              onSelectThread={onSelectThread}
              onRenameThread={onRenameThread}
              onDeleteThread={onDeleteThread}
            />
          </div>
        </>
      )}

      {collapsed && (
        <div className="sidebar__collapsed-actions">
          <button
            className="sidebar__icon-btn"
            onClick={() => onCreateThread()}
            title="New conversation"
            disabled={!activeUser}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        </div>
      )}
    </aside>
  );
}
