import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/connection';

export interface Message {
  id: string;
  thread_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

export function getMessagesByThread(threadId: string): Message[] {
  const db = getDb();
  return db
    .prepare('SELECT * FROM messages WHERE thread_id = ? ORDER BY created_at ASC')
    .all(threadId) as Message[];
}

export function addMessage(
  threadId: string,
  role: 'user' | 'assistant' | 'system',
  content: string
): Message {
  const db = getDb();
  const now = new Date().toISOString();
  const message: Message = {
    id: uuidv4(),
    thread_id: threadId,
    role,
    content,
    created_at: now,
  };
  db.prepare(
    'INSERT INTO messages (id, thread_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(message.id, message.thread_id, message.role, message.content, message.created_at);

  // Update thread updated_at
  db.prepare('UPDATE threads SET updated_at = ? WHERE id = ?').run(now, threadId);

  return message;
}

export function deleteMessagesByThread(threadId: string): void {
  const db = getDb();
  db.prepare('DELETE FROM messages WHERE thread_id = ?').run(threadId);
}
