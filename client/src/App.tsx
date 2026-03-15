import { useState, useEffect, useCallback } from 'react';
import { api } from './api/client';
import type { User, Thread } from './types';
import Sidebar from './components/Sidebar/Sidebar';
import ChatPanel from './components/Chat/ChatPanel';
import SettingsPanel from './components/Settings/SettingsPanel';
import './App.css';

export default function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [activeUser, setActiveUser] = useState<User | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeThread, setActiveThread] = useState<Thread | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(true);

  // Load users on mount
  useEffect(() => {
    api.users.list().then((users) => {
      setUsers(users);
      if (users.length > 0) setActiveUser(users[0]);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  // Load threads when user changes
  useEffect(() => {
    if (!activeUser) {
      setThreads([]);
      setActiveThread(null);
      return;
    }
    api.threads.list(activeUser.id).then((threads) => {
      setThreads(threads);
      setActiveThread(threads.length > 0 ? threads[0] : null);
    });
  }, [activeUser]);

  const handleCreateUser = useCallback(async (name: string) => {
    const user = await api.users.create(name);
    setUsers((prev) => [...prev, user]);
    setActiveUser(user);
  }, []);

  const handleRenameUser = useCallback(async (id: string, name: string) => {
    const updated = await api.users.rename(id, name);
    setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)));
    if (activeUser?.id === id) setActiveUser(updated);
  }, [activeUser]);

  const handleDeleteUser = useCallback(async (id: string) => {
    await api.users.delete(id);
    const remaining = users.filter((u) => u.id !== id);
    setUsers(remaining);
    if (activeUser?.id === id) {
      setActiveUser(remaining.length > 0 ? remaining[0] : null);
    }
  }, [users, activeUser]);

  const handleSelectUser = useCallback((user: User) => {
    setActiveUser(user);
    setActiveThread(null);
  }, []);

  const handleCreateThread = useCallback(async (title?: string) => {
    if (!activeUser) return;
    const thread = await api.threads.create(activeUser.id, title || 'New conversation');
    setThreads((prev) => [thread, ...prev]);
    setActiveThread(thread);
  }, [activeUser]);

  const handleRenameThread = useCallback(async (id: string, title: string) => {
    const updated = await api.threads.update(id, { title });
    setThreads((prev) => prev.map((t) => (t.id === id ? updated : t)));
    if (activeThread?.id === id) setActiveThread(updated);
  }, [activeThread]);

  const handleDeleteThread = useCallback(async (id: string) => {
    await api.threads.delete(id);
    const remaining = threads.filter((t) => t.id !== id);
    setThreads(remaining);
    if (activeThread?.id === id) {
      setActiveThread(remaining.length > 0 ? remaining[0] : null);
    }
  }, [threads, activeThread]);

  const handleSelectThread = useCallback((thread: Thread) => {
    setActiveThread(thread);
  }, []);

  const handleThreadUpdate = useCallback((updated: Thread) => {
    setThreads((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    if (activeThread?.id === updated.id) setActiveThread(updated);
  }, [activeThread]);

  if (loading) {
    return (
      <div className="app-loading">
        <div className="app-loading__spinner" />
      </div>
    );
  }

  return (
    <div className="app">
      <Sidebar
        users={users}
        activeUser={activeUser}
        threads={threads}
        activeThread={activeThread}
        onCreateUser={handleCreateUser}
        onRenameUser={handleRenameUser}
        onDeleteUser={handleDeleteUser}
        onSelectUser={handleSelectUser}
        onCreateThread={handleCreateThread}
        onRenameThread={handleRenameThread}
        onDeleteThread={handleDeleteThread}
        onSelectThread={handleSelectThread}
      />

      <div className="app__main">
        <div className="app__header">
          <div className="app__header-title">
            {activeThread ? activeThread.title : activeUser ? 'Select a conversation' : 'LLM Chat'}
          </div>
          <button
            className="app__settings-btn"
            onClick={() => setShowSettings(!showSettings)}
            title="Settings"
            aria-label="Toggle settings"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>

        <div className="app__content">
          <ChatPanel
            thread={activeThread}
            onThreadUpdate={handleThreadUpdate}
          />
          {showSettings && (
            <SettingsPanel
              thread={activeThread}
              onThreadUpdate={handleThreadUpdate}
              onClose={() => setShowSettings(false)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
