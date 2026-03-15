import { Router, Request, Response } from 'express';
import { getThreadById } from '../services/threadService';
import { getMessagesByThread, addMessage } from '../services/messageService';
import { sendChat, sendChatStream } from '../services/chatService';
import type { ChatMessage } from '../providers/types';

const router = Router();

// POST /api/chat/send — non-streaming fallback
router.post('/send', async (req: Request, res: Response) => {
  const { threadId, content } = req.body as {
    threadId?: string;
    content?: string;
  };

  if (!threadId) return res.status(400).json({ error: 'threadId is required' });
  if (!content || !content.trim()) return res.status(400).json({ error: 'content is required' });

  const thread = getThreadById(threadId);
  if (!thread) return res.status(404).json({ error: 'Thread not found' });

  // Persist user message
  const userMessage = addMessage(threadId, 'user', content.trim());

  // Build message history for context
  const history = getMessagesByThread(threadId);
  const chatMessages: ChatMessage[] = history
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

  // Send to provider
  const result = await sendChat(thread.provider, {
    messages: chatMessages,
    model: thread.model || '',
    temperature: thread.temperature,
    systemPrompt: thread.system_prompt || undefined,
  });

  if (result.error) {
    return res.status(200).json({
      userMessage,
      assistantMessage: null,
      error: result.error,
    });
  }

  const assistantMessage = addMessage(threadId, 'assistant', result.content);
  return res.json({ userMessage, assistantMessage });
});

// POST /api/chat/stream — SSE streaming endpoint
router.post('/stream', async (req: Request, res: Response) => {
  const { threadId, content } = req.body as {
    threadId?: string;
    content?: string;
  };

  if (!threadId || !content || !content.trim()) {
    res.status(400).json({ error: 'threadId and content are required' });
    return;
  }

  const thread = getThreadById(threadId);
  if (!thread) {
    res.status(404).json({ error: 'Thread not found' });
    return;
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  function sendEvent(data: object) {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  // Persist user message
  const userMessage = addMessage(threadId, 'user', content.trim());
  sendEvent({ type: 'user_message', message: userMessage });

  // Build message history
  const history = getMessagesByThread(threadId);
  const chatMessages: ChatMessage[] = history
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }));

  let accumulatedContent = '';

  // Track client disconnect — abort the LM Studio stream immediately so it
  // doesn't keep the model busy for subsequent requests.
  //
  // IMPORTANT: use res.on('close') — NOT req.on('close').
  // In Node.js v20+, req emits 'close' as soon as the request body is fully
  // consumed by body-parser, which happens before LM Studio ever responds.
  // res.on('close') fires only when the client actually closes the TCP
  // connection (e.g., navigates away or the browser tab is closed).
  let clientGone = false;
  const streamAbort = new AbortController();
  res.on('close', () => {
    if (!res.writableEnded) {
      clientGone = true;
      streamAbort.abort();
    }
  });

  await sendChatStream(
    thread.provider,
    {
      messages: chatMessages,
      model: thread.model || '',
      temperature: thread.temperature,
      systemPrompt: thread.system_prompt || undefined,
      signal: streamAbort.signal,
    },
    {
      onChunk(chunk: string) {
        if (clientGone) return;
        accumulatedContent += chunk;
        sendEvent({ type: 'token', content: chunk });
      },
      onDone() {
        if (clientGone) return;
        if (accumulatedContent.trim()) {
          const assistantMessage = addMessage(threadId, 'assistant', accumulatedContent);
          sendEvent({ type: 'done', message: assistantMessage });
        } else {
          sendEvent({ type: 'error', error: 'Model returned an empty response.' });
        }
        res.end();
      },
      onError(error: string) {
        if (clientGone) return;
        sendEvent({ type: 'error', error });
        res.end();
      },
    }
  );

  // Safety net: if sendChatStream returned without calling onDone/onError,
  // close the SSE response so the client is not left hanging.
  if (!res.writableEnded && !clientGone) {
    sendEvent({ type: 'error', error: 'Stream ended unexpectedly.' });
    res.end();
  }
});

export default router;
