import { Router, Request, Response } from 'express';
import { getDb } from '../db/connection';
import { getProvider } from '../services/chatService';
import { isAzureConfigured } from '../config';

const router = Router();

// GET /api/providers/models?provider=lmstudio
router.get('/models', async (req: Request, res: Response) => {
  const providerName = (req.query.provider as string) || 'lmstudio';
  const provider = getProvider(providerName);
  if (!provider) return res.status(400).json({ error: `Unknown provider: ${providerName}` });
  const result = await provider.listModels();
  return res.json(result);
});

// POST /api/providers/models/load
router.post('/models/load', async (req: Request, res: Response) => {
  const { provider: providerName, modelId } = req.body as {
    provider?: string;
    modelId?: string;
  };
  if (!modelId) return res.status(400).json({ error: 'modelId is required' });
  const provider = getProvider(providerName || 'lmstudio');
  if (!provider) return res.status(400).json({ error: `Unknown provider: ${providerName}` });
  const result = await provider.loadModel(modelId);
  return res.json(result);
});

// GET /api/providers/status
router.get('/status', (_req: Request, res: Response) => {
  return res.json({
    azure: {
      configured: isAzureConfigured(),
    },
    lmstudio: {
      configured: true,
    },
  });
});

// GET /api/settings
router.get('/settings', (_req: Request, res: Response) => {
  const db = getDb();
  const rows = db.prepare('SELECT key, value FROM settings').all() as Array<{ key: string; value: string }>;
  const settings: Record<string, string> = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  return res.json(settings);
});

// PATCH /api/settings
router.patch('/settings', (req: Request, res: Response) => {
  const db = getDb();
  const updates = req.body as Record<string, string>;
  const stmt = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  const transaction = db.transaction((entries: [string, string][]) => {
    for (const [key, value] of entries) {
      stmt.run(key, String(value));
    }
  });
  transaction(Object.entries(updates));
  const rows = db.prepare('SELECT key, value FROM settings').all() as Array<{ key: string; value: string }>;
  const settings: Record<string, string> = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  return res.json(settings);
});

export default router;
