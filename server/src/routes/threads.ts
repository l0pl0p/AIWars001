import { Router, Request, Response } from 'express';
import {
  getThreadsByUser,
  getThreadById,
  createThread,
  renameThread,
  updateThreadSettings,
  deleteThread,
} from '../services/threadService';
import { getUserById } from '../services/userService';

const router = Router();

// GET /api/users/:userId/threads
router.get('/users/:userId/threads', (req: Request, res: Response) => {
  const user = getUserById(req.params.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  return res.json(getThreadsByUser(req.params.userId));
});

// POST /api/users/:userId/threads
router.post('/users/:userId/threads', (req: Request, res: Response) => {
  const user = getUserById(req.params.userId);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const { title } = req.body as { title?: string };
  const threadTitle = title?.trim() || 'New conversation';
  const thread = createThread(req.params.userId, threadTitle);
  return res.status(201).json(thread);
});

// GET /api/threads/:id
router.get('/threads/:id', (req: Request, res: Response) => {
  const thread = getThreadById(req.params.id);
  if (!thread) return res.status(404).json({ error: 'Thread not found' });
  return res.json(thread);
});

// PATCH /api/threads/:id
router.patch('/threads/:id', (req: Request, res: Response) => {
  const { title, provider, model, system_prompt, temperature } = req.body as {
    title?: string;
    provider?: string;
    model?: string;
    system_prompt?: string;
    temperature?: number;
  };

  const thread = getThreadById(req.params.id);
  if (!thread) return res.status(404).json({ error: 'Thread not found' });

  if (title !== undefined) {
    const updated = renameThread(req.params.id, title);
    if (!updated) return res.status(404).json({ error: 'Thread not found' });
  }

  const settingsUpdates: Parameters<typeof updateThreadSettings>[1] = {};
  if (provider !== undefined) settingsUpdates.provider = provider;
  if (model !== undefined) settingsUpdates.model = model;
  if (system_prompt !== undefined) settingsUpdates.system_prompt = system_prompt;
  if (temperature !== undefined) settingsUpdates.temperature = temperature;

  if (Object.keys(settingsUpdates).length > 0) {
    const updated = updateThreadSettings(req.params.id, settingsUpdates);
    if (!updated) return res.status(404).json({ error: 'Thread not found' });
  }

  return res.json(getThreadById(req.params.id));
});

// DELETE /api/threads/:id
router.delete('/threads/:id', (req: Request, res: Response) => {
  const deleted = deleteThread(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'Thread not found' });
  return res.status(204).end();
});

export default router;
