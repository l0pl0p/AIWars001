import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db/connection';

export interface User {
  id: string;
  name: string;
  created_at: string;
}

export function getAllUsers(): User[] {
  const db = getDb();
  return db.prepare('SELECT * FROM users ORDER BY created_at ASC').all() as User[];
}

export function getUserById(id: string): User | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
}

export function createUser(name: string): User {
  const db = getDb();
  const user: User = {
    id: uuidv4(),
    name: name.trim(),
    created_at: new Date().toISOString(),
  };
  db.prepare('INSERT INTO users (id, name, created_at) VALUES (?, ?, ?)').run(
    user.id,
    user.name,
    user.created_at
  );
  return user;
}

export function renameUser(id: string, name: string): User | null {
  const db = getDb();
  const result = db.prepare('UPDATE users SET name = ? WHERE id = ?').run(name.trim(), id);
  if (result.changes === 0) return null;
  return getUserById(id) || null;
}

export function deleteUser(id: string): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM users WHERE id = ?').run(id);
  return result.changes > 0;
}
