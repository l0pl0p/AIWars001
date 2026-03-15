import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/connection';

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

export function getThreadsByUser(userId: string): Thread[] {
  const db = getDb();
  return db
    .prepare('SELECT * FROM threads WHERE user_id = ? ORDER BY updated_at DESC')
    .all(userId) as Thread[];
}

export function getThreadById(id: string): Thread | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM threads WHERE id = ?').get(id) as Thread | undefined;
}

export function createThread(userId: string, title: string): Thread {
  const db = getDb();
  const now = new Date().toISOString();
  const thread: Thread = {
    id: uuidv4(),
    user_id: userId,
    title: title.trim(),
    provider: 'lmstudio',
    model: null,
    system_prompt: null,
    temperature: 0.7,
    created_at: now,
    updated_at: now,
  };
  db.prepare(
    `INSERT INTO threads (id, user_id, title, provider, model, system_prompt, temperature, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    thread.id,
    thread.user_id,
    thread.title,
    thread.provider,
    thread.model,
    thread.system_prompt,
    thread.temperature,
    thread.created_at,
    thread.updated_at
  );
  return thread;
}

export function renameThread(id: string, title: string): Thread | null {
  const db = getDb();
  const now = new Date().toISOString();
  const result = db
    .prepare('UPDATE threads SET title = ?, updated_at = ? WHERE id = ?')
    .run(title.trim(), now, id);
  if (result.changes === 0) return null;
  return getThreadById(id) || null;
}

export function updateThreadSettings(
  id: string,
  updates: Partial<Pick<Thread, 'provider' | 'model' | 'system_prompt' | 'temperature'>>
): Thread | null {
  const db = getDb();
  const thread = getThreadById(id);
  if (!thread) return null;

  const now = new Date().toISOString();
  const merged = { ...thread, ...updates };
  db.prepare(
    `UPDATE threads SET provider = ?, model = ?, system_prompt = ?, temperature = ?, updated_at = ? WHERE id = ?`
  ).run(merged.provider, merged.model, merged.system_prompt, merged.temperature, now, id);

  return getThreadById(id) || null;
}

export function deleteThread(id: string): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM threads WHERE id = ?').run(id);
  return result.changes > 0;
}
