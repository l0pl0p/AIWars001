/**
 * Standalone streaming diagnostic — run with:
 *   cd server && npx tsx test-stream.ts
 *
 * This script bypasses Express entirely and tests whether Node.js can receive
 * a streaming (SSE) response from LM Studio directly.
 *
 * If this works:  the issue is Express-specific (middleware, signals, etc.)
 * If this hangs:  the issue is Node.js ↔ LM Studio at the network/runtime level
 */

import * as http from 'http';

// ── config ─────────────────────────────────────────────────────────────────
const LM_STUDIO_HOST = 'localhost';
const LM_STUDIO_PORT = 1234;
const MODEL = process.argv[2] ?? 'qwen/qwen3-4b-thinking-2507';
const PROMPT = process.argv[3] ?? 'Reply with exactly three words.';

const body = JSON.stringify({
  model: MODEL,
  messages: [{ role: 'user', content: PROMPT }],
  temperature: 0.7,
  stream: true,
});

console.log('=== LM Studio streaming diagnostic ===');
console.log('Host   :', LM_STUDIO_HOST + ':' + LM_STUDIO_PORT);
console.log('Model  :', MODEL);
console.log('Prompt :', PROMPT);
console.log('--------------------------------------');
console.log('Starting request…');

// Hard timeout so the script always exits cleanly
const hardTimeout = setTimeout(() => {
  console.error('\n[TIMEOUT] No response after 30 seconds — LM Studio may be unresponsive for streaming requests.');
  process.exit(2);
}, 30_000);

const startTime = Date.now();

const req = http.request(
  {
    hostname: LM_STUDIO_HOST,
    port: LM_STUDIO_PORT,
    path: '/v1/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(body),
    },
  },
  (res) => {
    const elapsed = Date.now() - startTime;
    console.log(`[${elapsed}ms] Got HTTP response — status: ${res.statusCode}`);
    console.log('[headers]', res.headers);

    let buffer = '';
    let tokenCount = 0;

    res.on('data', (chunk: Buffer) => {
      const elapsed2 = Date.now() - startTime;
      const text = chunk.toString();
      buffer += text;

      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const raw = trimmed.slice(5).trim();
        if (!raw || raw === '[DONE]') {
          if (raw === '[DONE]') {
            console.log(`\n[${elapsed2}ms] Received [DONE] — ${tokenCount} tokens total`);
          }
          continue;
        }
        try {
          const parsed = JSON.parse(raw) as {
            choices?: Array<{ delta?: { content?: string }; finish_reason?: string | null }>;
          };
          const token = parsed.choices?.[0]?.delta?.content;
          if (token) {
            tokenCount++;
            process.stdout.write(token);
          }
        } catch {
          // ignore malformed lines
        }
      }
    });

    res.on('end', () => {
      const elapsed2 = Date.now() - startTime;
      console.log(`\n[${elapsed2}ms] Stream ended — total tokens: ${tokenCount}`);
      clearTimeout(hardTimeout);
      process.exit(0);
    });

    res.on('error', (err) => {
      console.error('\n[response error]', err);
      clearTimeout(hardTimeout);
      process.exit(1);
    });
  }
);

req.on('socket', (socket) => {
  console.log('[socket] Socket assigned — connecting…');
  socket.on('connect', () => {
    const elapsed = Date.now() - startTime;
    console.log(`[${elapsed}ms] TCP connected`);
  });
});

req.on('error', (err) => {
  console.error('[request error]', err.message);
  clearTimeout(hardTimeout);
  process.exit(1);
});

// Also test with native fetch (runs concurrently for comparison)
(async () => {
  await new Promise((resolve) => setTimeout(resolve, 100)); // small delay so http.request logs appear first
  console.log('\n--- Also testing via native fetch (parallel) ---');
  const fetchStart = Date.now();
  try {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 30_000);

    const res = await fetch(`http://${LM_STUDIO_HOST}:${LM_STUDIO_PORT}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: 'One word answer only: yes or no.' }],
        temperature: 0.7,
        stream: true,
      }),
      signal: controller.signal,
    });
    clearTimeout(t);
    const elapsed = Date.now() - fetchStart;
    console.log(`[fetch ${elapsed}ms] Response status:`, res.status);
    if (res.body) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fetchTokens = 0;
      let buf = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (const line of lines) {
          const t2 = line.trim();
          if (!t2.startsWith('data:')) continue;
          const raw = t2.slice(5).trim();
          if (!raw || raw === '[DONE]') continue;
          try {
            const p = JSON.parse(raw) as { choices?: Array<{ delta?: { content?: string } }> };
            const tok = p.choices?.[0]?.delta?.content;
            if (tok) { fetchTokens++; process.stdout.write(tok); }
          } catch { /* skip */ }
        }
      }
      const elapsed2 = Date.now() - fetchStart;
      console.log(`\n[fetch ${elapsed2}ms] Done — ${fetchTokens} tokens`);
    }
  } catch (err: unknown) {
    const elapsed = Date.now() - fetchStart;
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`[fetch ${elapsed}ms] ERROR:`, msg);
  }
})();

req.write(body);
req.end();
console.log('Request body sent, waiting for response…');
