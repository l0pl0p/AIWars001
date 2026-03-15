import express from 'express';
import cors from 'cors';
import { config } from './config';
import { getDb } from './db/connection';

import usersRouter from './routes/users';
import threadsRouter from './routes/threads';
import messagesRouter from './routes/messages';
import providersRouter from './routes/providers';
import chatRouter from './routes/chat';

const app = express();

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000'] }));
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Routes
app.use('/api/users', usersRouter);
app.use('/api', threadsRouter);
app.use('/api', messagesRouter);
app.use('/api/providers', providersRouter);
app.use('/api/chat', chatRouter);

// Initialize DB on startup
getDb();

app.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`);
});

export default app;
