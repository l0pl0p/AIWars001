import { describe, it, expect, beforeEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import { createSchema } from '../../server/src/db/schema';

// Create an in-memory DB for testing
let testDb: Database.Database;

vi.mock('../../server/src/db/connection', () => ({
  getDb: () => testDb,
  closeDb: () => {},
}));

beforeEach(() => {
  testDb = new Database(':memory:');
  testDb.pragma('foreign_keys = ON');
  createSchema(testDb);
});

describe('userService', () => {
  it('creates a user', async () => {
    const { createUser } = await import('../../server/src/services/userService');
    vi.resetModules();
    const { createUser: cu } = await import('../../server/src/services/userService');
    const user = cu('Alice');
    expect(user.name).toBe('Alice');
    expect(user.id).toBeTruthy();
    expect(user.created_at).toBeTruthy();
  });

  it('creates and retrieves users', async () => {
    const { createUser, getAllUsers } = await import('../../server/src/services/userService');
    const user1 = createUser('Alice');
    const user2 = createUser('Bob');
    const users = getAllUsers();
    expect(users).toHaveLength(2);
    expect(users.map((u) => u.name)).toContain('Alice');
    expect(users.map((u) => u.name)).toContain('Bob');
  });

  it('renames a user', async () => {
    const { createUser, renameUser, getUserById } = await import('../../server/src/services/userService');
    const user = createUser('Alice');
    renameUser(user.id, 'Alicia');
    const updated = getUserById(user.id);
    expect(updated?.name).toBe('Alicia');
  });

  it('deletes a user', async () => {
    const { createUser, deleteUser, getAllUsers } = await import('../../server/src/services/userService');
    const user = createUser('Alice');
    deleteUser(user.id);
    const users = getAllUsers();
    expect(users).toHaveLength(0);
  });

  it('returns null when renaming a non-existent user', async () => {
    const { renameUser } = await import('../../server/src/services/userService');
    const result = renameUser('non-existent-id', 'Test');
    expect(result).toBeNull();
  });
});

describe('threadService', () => {
  it('creates a thread for a user', async () => {
    const { createUser } = await import('../../server/src/services/userService');
    const { createThread, getThreadsByUser } = await import('../../server/src/services/threadService');
    const user = createUser('Alice');
    const thread = createThread(user.id, 'My Thread');
    expect(thread.title).toBe('My Thread');
    expect(thread.user_id).toBe(user.id);
    expect(thread.provider).toBe('lmstudio');

    const threads = getThreadsByUser(user.id);
    expect(threads).toHaveLength(1);
  });

  it('deletes a thread and its messages', async () => {
    const { createUser } = await import('../../server/src/services/userService');
    const { createThread, deleteThread, getThreadsByUser } = await import('../../server/src/services/threadService');
    const { addMessage, getMessagesByThread } = await import('../../server/src/services/messageService');

    const user = createUser('Alice');
    const thread = createThread(user.id, 'Test');
    addMessage(thread.id, 'user', 'hello');

    deleteThread(thread.id);
    const threads = getThreadsByUser(user.id);
    expect(threads).toHaveLength(0);
    const messages = getMessagesByThread(thread.id);
    expect(messages).toHaveLength(0);
  });

  it('deleting user cascades to threads', async () => {
    const { createUser, deleteUser } = await import('../../server/src/services/userService');
    const { createThread, getThreadsByUser } = await import('../../server/src/services/threadService');
    const user = createUser('Alice');
    createThread(user.id, 'Thread 1');
    createThread(user.id, 'Thread 2');
    deleteUser(user.id);
    const threads = getThreadsByUser(user.id);
    expect(threads).toHaveLength(0);
  });
});

describe('messageService', () => {
  it('adds and retrieves messages', async () => {
    const { createUser } = await import('../../server/src/services/userService');
    const { createThread } = await import('../../server/src/services/threadService');
    const { addMessage, getMessagesByThread } = await import('../../server/src/services/messageService');

    const user = createUser('Alice');
    const thread = createThread(user.id, 'Chat');
    addMessage(thread.id, 'user', 'Hello');
    addMessage(thread.id, 'assistant', 'Hi there!');

    const messages = getMessagesByThread(thread.id);
    expect(messages).toHaveLength(2);
    expect(messages[0].role).toBe('user');
    expect(messages[0].content).toBe('Hello');
    expect(messages[1].role).toBe('assistant');
    expect(messages[1].content).toBe('Hi there!');
  });

  it('messages are ordered by created_at', async () => {
    const { createUser } = await import('../../server/src/services/userService');
    const { createThread } = await import('../../server/src/services/threadService');
    const { addMessage, getMessagesByThread } = await import('../../server/src/services/messageService');

    const user = createUser('Alice');
    const thread = createThread(user.id, 'Chat');
    addMessage(thread.id, 'user', 'First');
    addMessage(thread.id, 'assistant', 'Second');
    addMessage(thread.id, 'user', 'Third');

    const messages = getMessagesByThread(thread.id);
    expect(messages[0].content).toBe('First');
    expect(messages[1].content).toBe('Second');
    expect(messages[2].content).toBe('Third');
  });
});
