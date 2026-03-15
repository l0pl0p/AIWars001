import { Router, Request, Response } from 'express';
import {
  getAllUsers,
  createUser,
  renameUser,
  deleteUser,
  getUserById,
} from '../services/userService';

const router = Router();

// GET /api/users
router.get('/', (_req: Request, res: Response) => {
  const users = getAllUsers();
  res.json(users);
});

// GET /api/users/:id
router.get('/:id', (req: Request, res: Response) => {
  const user = getUserById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  return res.json(user);
});

// POST /api/users
router.post('/', (req: Request, res: Response) => {
  const { name } = req.body as { name?: string };
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }
  const user = createUser(name);
  return res.status(201).json(user);
});

// PATCH /api/users/:id
router.patch('/:id', (req: Request, res: Response) => {
  const { name } = req.body as { name?: string };
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }
  const user = renameUser(req.params.id, name);
  if (!user) return res.status(404).json({ error: 'User not found' });
  return res.json(user);
});

// DELETE /api/users/:id
router.delete('/:id', (req: Request, res: Response) => {
  const deleted = deleteUser(req.params.id);
  if (!deleted) return res.status(404).json({ error: 'User not found' });
  return res.status(204).end();
});

export default router;
