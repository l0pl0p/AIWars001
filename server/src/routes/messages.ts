import { Router, Request, Response } from 'express';
import { getMessagesByThread } from '../services/messageService';
import { getThreadById } from '../services/threadService';

const router = Router();

// GET /api/threads/:id/messages
router.get('/threads/:id/messages', (req: Request, res: Response) => {
  const thread = getThreadById(req.params.id);
  if (!thread) return res.status(404).json({ error: 'Thread not found' });
  return res.json(getMessagesByThread(req.params.id));
});

export default router;
