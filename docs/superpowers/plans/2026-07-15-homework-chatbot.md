# Homework Chatbot Widget Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first working prototype of "Ada," a draggable, dismissible homework-helper chatbot widget that floats over the app, backed by a minimal streaming chat backend.

**Architecture:** A frontend widget (`frontend/src/components/chatbot/`) owns drag position, open/dismissed state, and message history (all persisted to `localStorage`), and talks to a new minimal Express backend (`backend/`) over `POST /api/chat`, which streams a reply back chunk-by-chunk from a swappable AI-provider registry. For this prototype the only registered provider is a deterministic `mock` provider (canned streaming text, no external API or key required) — this exercises the entire flow end-to-end today; real providers (Anthropic/OpenAI) are explicitly deferred per the design spec.

**Tech Stack:** React 19 + Vite (existing frontend), Vitest + jsdom + `@testing-library/react` for frontend tests (newly added), Node.js 22 + Express for the new backend, Node's built-in `node:test` runner for backend tests (no new backend test dependency needed).

## Global Constraints

- Position, open/closed/dismissed state, and message history persist via `localStorage` (spec: Data flow, Architecture).
- The bot is a fully separate conversation — it must never read or reference the calculator's current input (spec: Scope, explicitly out).
- No UI spotlighting/highlighting or bot-driven navigation — conversational help only (spec: Scope, explicitly out).
- Provider selection is driven by an `AI_PROVIDER` env var; an unconfigured/unknown provider must return HTTP 503 with a clear message, never crash the server (spec: Architecture, Error handling).
- Basic per-IP rate limiting on the backend; exceeding it returns HTTP 429 (spec: Architecture, Error handling).
- No real external API calls in tests/CI — provider tests use the mock provider or injected fakes (spec: Testing).
- `.env` files are gitignored; `.env.example` documents required variables (spec: Architecture).
- CORS must be configured for local dev (frontend and backend run on different ports) (spec: Architecture).

---

### Task 1: Frontend test tooling + draggable positioning hook

**Files:**
- Modify: `frontend/package.json` (add devDependencies + `test` script)
- Modify: `frontend/vite.config.js` (add Vitest `test` config)
- Create: `frontend/src/setupTests.js`
- Create: `frontend/src/components/chatbot/useDraggable.js`
- Test: `frontend/src/components/chatbot/useDraggable.test.js`

**Interfaces:**
- Produces: `clampPosition(position: {x,y}, size: {width,height}, viewport: {width,height}) => {x,y}` (pure function, named export)
- Produces: `useDraggable({ initialPosition: {x,y}, size: {width,height}, onDragEnd?: (pos) => void }) => { position: {x,y}, isDragging: boolean, handlePointerDown: (e) => void, hasMovedRef: { current: boolean } }` (named export)

- [ ] **Step 1: Install frontend test dependencies**

Run:
```bash
cd frontend
npm install -D vitest jsdom @testing-library/react @testing-library/jest-dom
```
Expected: `package.json` gains four new `devDependencies` entries; `package-lock.json` updates.

- [ ] **Step 2: Wire Vitest into the existing Vite config**

Modify `frontend/vite.config.js` to:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'jsdom',
    setupFiles: './src/setupTests.js',
  },
})
```

- [ ] **Step 3: Create the test setup file**

Create `frontend/src/setupTests.js`:

```js
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 4: Add the `test` script**

In `frontend/package.json`, add to `"scripts"`:

```json
"test": "vitest run"
```

- [ ] **Step 5: Write the failing test for `clampPosition` and `useDraggable`**

Create `frontend/src/components/chatbot/useDraggable.test.js`:

```js
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { clampPosition, useDraggable } from './useDraggable';

describe('clampPosition', () => {
  it('keeps a position that already fits within bounds', () => {
    const result = clampPosition({ x: 50, y: 50 }, { width: 40, height: 40 }, { width: 200, height: 200 });
    expect(result).toEqual({ x: 50, y: 50 });
  });

  it('clamps negative coordinates to zero', () => {
    const result = clampPosition({ x: -20, y: -5 }, { width: 40, height: 40 }, { width: 200, height: 200 });
    expect(result).toEqual({ x: 0, y: 0 });
  });

  it('clamps coordinates that would push the element past the viewport edge', () => {
    const result = clampPosition({ x: 190, y: 190 }, { width: 40, height: 40 }, { width: 200, height: 200 });
    expect(result).toEqual({ x: 160, y: 160 });
  });
});

describe('useDraggable', () => {
  const size = { width: 40, height: 40 };
  const viewport = { width: 300, height: 300 };

  beforeEachViewport(viewport);

  it('starts at the clamped initial position', () => {
    const { result } = renderHook(() =>
      useDraggable({ initialPosition: { x: 10, y: 10 }, size })
    );
    expect(result.current.position).toEqual({ x: 10, y: 10 });
  });

  it('updates position while dragging and calls onDragEnd with the final clamped position on release', () => {
    const onDragEnd = vi.fn();
    const { result } = renderHook(() =>
      useDraggable({ initialPosition: { x: 10, y: 10 }, size, onDragEnd })
    );

    act(() => {
      result.current.handlePointerDown({ clientX: 10, clientY: 10 });
    });
    expect(result.current.isDragging).toBe(true);

    act(() => {
      window.dispatchEvent(new window.PointerEvent('pointermove', { clientX: 60, clientY: 45 }));
    });
    expect(result.current.position).toEqual({ x: 60, y: 45 });
    expect(result.current.hasMovedRef.current).toBe(true);

    act(() => {
      window.dispatchEvent(new window.PointerEvent('pointerup'));
    });
    expect(result.current.isDragging).toBe(false);
    expect(onDragEnd).toHaveBeenCalledWith({ x: 60, y: 45 });
  });

  it('does not mark a move as a drag when no pointermove fired before pointerup', () => {
    const { result } = renderHook(() =>
      useDraggable({ initialPosition: { x: 10, y: 10 }, size })
    );
    act(() => {
      result.current.handlePointerDown({ clientX: 10, clientY: 10 });
    });
    act(() => {
      window.dispatchEvent(new window.PointerEvent('pointerup'));
    });
    expect(result.current.hasMovedRef.current).toBe(false);
  });

  it('re-clamps the current position when size grows past the viewport edge', () => {
    const { result, rerender } = renderHook(
      ({ size }) => useDraggable({ initialPosition: { x: 270, y: 270 }, size }),
      { initialProps: { size: { width: 20, height: 20 } } }
    );
    expect(result.current.position).toEqual({ x: 270, y: 270 });

    rerender({ size: { width: 60, height: 60 } });
    expect(result.current.position).toEqual({ x: 240, y: 240 });
  });
});

function beforeEachViewport({ width, height }) {
  window.innerWidth = width;
  window.innerHeight = height;
}
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `cd frontend && npx vitest run src/components/chatbot/useDraggable.test.js`
Expected: FAIL — `Cannot find module './useDraggable'` (file doesn't exist yet).

- [ ] **Step 7: Implement `useDraggable.js`**

Create `frontend/src/components/chatbot/useDraggable.js`:

```js
import { useEffect, useRef, useState } from 'react';

export function clampPosition(position, size, viewport) {
  const maxX = Math.max(0, viewport.width - size.width);
  const maxY = Math.max(0, viewport.height - size.height);
  return {
    x: Math.min(Math.max(position.x, 0), maxX),
    y: Math.min(Math.max(position.y, 0), maxY),
  };
}

function getViewport() {
  return { width: window.innerWidth, height: window.innerHeight };
}

export function useDraggable({ initialPosition, size, onDragEnd }) {
  const [position, setPosition] = useState(() => clampPosition(initialPosition, size, getViewport()));
  const [isDragging, setIsDragging] = useState(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const latestPositionRef = useRef(position);
  const hasMovedRef = useRef(false);

  useEffect(() => {
    setPosition((prev) => {
      const next = clampPosition(prev, size, getViewport());
      latestPositionRef.current = next;
      return next;
    });
  }, [size]);

  function handlePointerDown(e) {
    hasMovedRef.current = false;
    dragOffsetRef.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    setIsDragging(true);
  }

  useEffect(() => {
    if (!isDragging) return undefined;

    function handlePointerMove(e) {
      hasMovedRef.current = true;
      const next = clampPosition(
        { x: e.clientX - dragOffsetRef.current.x, y: e.clientY - dragOffsetRef.current.y },
        size,
        getViewport()
      );
      latestPositionRef.current = next;
      setPosition(next);
    }

    function handlePointerUp() {
      setIsDragging(false);
      onDragEnd?.(latestPositionRef.current);
    }

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [isDragging, size, onDragEnd]);

  return { position, isDragging, handlePointerDown, hasMovedRef };
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `cd frontend && npx vitest run src/components/chatbot/useDraggable.test.js`
Expected: PASS (5 tests)

- [ ] **Step 9: Commit**

```bash
git add frontend/package.json frontend/package-lock.json frontend/vite.config.js frontend/src/setupTests.js frontend/src/components/chatbot/useDraggable.js frontend/src/components/chatbot/useDraggable.test.js
git commit -m "feat(chatbot): add draggable-position hook with viewport clamping"
```

---

### Task 2: Persisted state hook

**Files:**
- Create: `frontend/src/components/chatbot/usePersistedState.js`
- Test: `frontend/src/components/chatbot/usePersistedState.test.js`

**Interfaces:**
- Produces: `usePersistedState(key: string, defaultValue: any) => [value, setValue]` (named export, same call shape as `useState`)

- [ ] **Step 1: Write the failing test**

Create `frontend/src/components/chatbot/usePersistedState.test.js`:

```js
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePersistedState } from './usePersistedState';

describe('usePersistedState', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('returns the default value when nothing is stored', () => {
    const { result } = renderHook(() => usePersistedState('test:key', 'default'));
    expect(result.current[0]).toBe('default');
  });

  it('persists updates to localStorage and reflects them on next mount', () => {
    const { result, unmount } = renderHook(() => usePersistedState('test:key', 'default'));
    act(() => {
      result.current[1]('updated');
    });
    expect(result.current[0]).toBe('updated');
    expect(window.localStorage.getItem('test:key')).toBe(JSON.stringify('updated'));
    unmount();

    const { result: secondMount } = renderHook(() => usePersistedState('test:key', 'default'));
    expect(secondMount.current[0]).toBe('updated');
  });

  it('falls back to the default value when stored JSON is malformed', () => {
    window.localStorage.setItem('test:key', '{not valid json');
    const { result } = renderHook(() => usePersistedState('test:key', 'default'));
    expect(result.current[0]).toBe('default');
  });

  it('supports object values', () => {
    const { result } = renderHook(() => usePersistedState('test:obj', { x: 0, y: 0 }));
    act(() => {
      result.current[1]({ x: 5, y: 9 });
    });
    expect(JSON.parse(window.localStorage.getItem('test:obj'))).toEqual({ x: 5, y: 9 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/chatbot/usePersistedState.test.js`
Expected: FAIL — `Cannot find module './usePersistedState'`

- [ ] **Step 3: Implement `usePersistedState.js`**

Create `frontend/src/components/chatbot/usePersistedState.js`:

```js
import { useEffect, useState } from 'react';

export function usePersistedState(key, defaultValue) {
  const [value, setValue] = useState(() => {
    try {
      const stored = window.localStorage.getItem(key);
      return stored === null ? defaultValue : JSON.parse(stored);
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // localStorage unavailable (private browsing, quota, etc.) - ignore
    }
  }, [key, value]);

  return [value, setValue];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/chatbot/usePersistedState.test.js`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/chatbot/usePersistedState.js frontend/src/components/chatbot/usePersistedState.test.js
git commit -m "feat(chatbot): add localStorage-backed persisted state hook"
```

---

### Task 3: Backend scaffold, provider registry, and mock provider

**Files:**
- Create: `backend/package.json`
- Create: `backend/.gitignore`
- Create: `backend/.env.example`
- Create: `backend/src/providers/mockProvider.js`
- Create: `backend/src/providers/index.js`
- Test: `backend/test/providers.test.js`

**Interfaces:**
- Produces: `mockProvider: { name: string, isConfigured: () => boolean, stream: (messages) => AsyncGenerator<string> }` (named export from `mockProvider.js`)
- Produces: `getProvider(name: string | undefined) => Provider | null` (named export from `providers/index.js`) — a `Provider` is the shape above.

- [ ] **Step 1: Create the backend package**

Run:
```bash
mkdir -p backend/src/providers backend/test
```

Create `backend/package.json`:

```json
{
  "name": "backend",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "start": "node src/server.js",
    "dev": "node --watch src/server.js",
    "test": "node --test"
  },
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.4.5",
    "express": "^4.21.1"
  }
}
```

Create `backend/.gitignore`:

```
node_modules/
.env
```

Create `backend/.env.example`:

```
# Which AI provider to use. Only "mock" is implemented for this prototype -
# canned streaming replies, no external API calls or key required, so the
# whole chat flow can be exercised locally without any credentials.
#
# Real providers (anthropic/openai) are an explicit follow-up once one is
# chosen - see docs/superpowers/specs/2026-07-15-homework-chatbot-design.md.
AI_PROVIDER=mock

# Port the backend listens on.
PORT=3001
```

- [ ] **Step 2: Install backend dependencies**

Run: `cd backend && npm install`
Expected: `node_modules/` created, `package-lock.json` generated, `express`/`cors`/`dotenv` installed.

- [ ] **Step 3: Write the failing test for the provider registry**

Create `backend/test/providers.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getProvider } from '../src/providers/index.js';

test('getProvider returns the mock provider for "mock"', () => {
  const provider = getProvider('mock');
  assert.ok(provider);
  assert.equal(provider.name, 'mock');
  assert.equal(typeof provider.stream, 'function');
});

test('getProvider returns null for an unregistered name', () => {
  assert.equal(getProvider('anthropic'), null);
  assert.equal(getProvider('nonexistent'), null);
});

test('getProvider returns null when no name is given', () => {
  assert.equal(getProvider(undefined), null);
});

test('mock provider streams a non-empty sequence of text chunks referencing the last user message', async () => {
  const provider = getProvider('mock');
  const chunks = [];
  for await (const chunk of provider.stream([
    { role: 'user', content: 'what is a derivative' },
  ])) {
    chunks.push(chunk);
  }
  assert.ok(chunks.length > 0);
  assert.ok(chunks.join('').includes('derivative'));
});
```

- [ ] **Step 4: Run test to verify it fails**

Run: `cd backend && node --test test/providers.test.js`
Expected: FAIL — `Cannot find module '../src/providers/index.js'`

- [ ] **Step 5: Implement the mock provider and registry**

Create `backend/src/providers/mockProvider.js`:

```js
export const mockProvider = {
  name: 'mock',
  isConfigured: () => true,
  async *stream(messages) {
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
    const reply =
      `Here's a mock answer to: "${lastUserMessage?.content ?? ''}". ` +
      'Once a real AI provider is configured, this is where an actual homework answer will appear.';
    const words = reply.split(' ');
    for (const word of words) {
      yield word + ' ';
      await new Promise((resolve) => setTimeout(resolve, 15));
    }
  },
};
```

Create `backend/src/providers/index.js`:

```js
import { mockProvider } from './mockProvider.js';

const REGISTRY = {
  mock: mockProvider,
};

export function getProvider(name) {
  const provider = REGISTRY[name];
  if (!provider || !provider.isConfigured()) return null;
  return provider;
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `cd backend && node --test test/providers.test.js`
Expected: PASS (4 tests)

- [ ] **Step 7: Commit**

```bash
git add backend/package.json backend/package-lock.json backend/.gitignore backend/.env.example backend/src/providers backend/test/providers.test.js
git commit -m "feat(chatbot-backend): scaffold backend with mock provider registry"
```

---

### Task 4: In-memory rate limiter

**Files:**
- Create: `backend/src/rateLimiter.js`
- Test: `backend/test/rateLimiter.test.js`

**Interfaces:**
- Produces: `createRateLimiter({ windowMs: number, max: number }) => (req, res, next) => void` — an Express-compatible middleware factory. Expects `req.ip` to identify the caller. On limit exceeded, calls `res.status(429).json({ error: string })` and does not call `next()`.

- [ ] **Step 1: Write the failing test**

Create `backend/test/rateLimiter.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRateLimiter } from '../src/rateLimiter.js';

function createFakeRes() {
  const res = { statusCode: 200, body: null };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body) => {
    res.body = body;
  };
  return res;
}

test('allows requests under the limit', () => {
  const limiter = createRateLimiter({ windowMs: 1000, max: 2 });
  const req = { ip: '1.2.3.4' };
  let nextCalled = 0;
  const res = createFakeRes();
  limiter(req, res, () => nextCalled++);
  limiter(req, res, () => nextCalled++);
  assert.equal(nextCalled, 2);
  assert.equal(res.statusCode, 200);
});

test('blocks requests once the limit is exceeded', () => {
  const limiter = createRateLimiter({ windowMs: 1000, max: 1 });
  const req = { ip: '5.6.7.8' };
  let nextCalled = 0;
  const res = createFakeRes();
  limiter(req, res, () => nextCalled++);
  limiter(req, res, () => nextCalled++);
  assert.equal(nextCalled, 1);
  assert.equal(res.statusCode, 429);
  assert.ok(res.body.error);
});

test('tracks each IP independently', () => {
  const limiter = createRateLimiter({ windowMs: 1000, max: 1 });
  const res = createFakeRes();
  let nextCalled = 0;
  limiter({ ip: 'a' }, res, () => nextCalled++);
  limiter({ ip: 'b' }, res, () => nextCalled++);
  assert.equal(nextCalled, 2);
});

test('resets after the window elapses', async () => {
  const limiter = createRateLimiter({ windowMs: 50, max: 1 });
  const req = { ip: '9.9.9.9' };
  const res = createFakeRes();
  let nextCalled = 0;
  limiter(req, res, () => nextCalled++);
  await new Promise((resolve) => setTimeout(resolve, 60));
  limiter(req, res, () => nextCalled++);
  assert.equal(nextCalled, 2);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && node --test test/rateLimiter.test.js`
Expected: FAIL — `Cannot find module '../src/rateLimiter.js'`

- [ ] **Step 3: Implement the rate limiter**

Create `backend/src/rateLimiter.js`:

```js
export function createRateLimiter({ windowMs, max }) {
  const hitsByKey = new Map();

  return function rateLimiter(req, res, next) {
    const key = req.ip;
    const now = Date.now();
    const recentHits = (hitsByKey.get(key) ?? []).filter((timestamp) => now - timestamp < windowMs);

    if (recentHits.length >= max) {
      res.status(429).json({ error: "Too many messages. Please wait a moment before trying again." });
      return;
    }

    recentHits.push(now);
    hitsByKey.set(key, recentHits);
    next();
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && node --test test/rateLimiter.test.js`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/src/rateLimiter.js backend/test/rateLimiter.test.js
git commit -m "feat(chatbot-backend): add in-memory per-IP rate limiter"
```

---

### Task 5: Chat route, system prompt, and server bootstrap

**Files:**
- Create: `backend/src/systemPrompt.js`
- Create: `backend/src/routes/chat.js`
- Create: `backend/src/server.js`
- Test: `backend/test/chat.route.test.js`

**Interfaces:**
- Consumes: `getProvider` from `../providers/index.js` (Task 3); `createRateLimiter` from `../rateLimiter.js` (Task 4)
- Produces: `SYSTEM_PROMPT: string` (named export from `systemPrompt.js`)
- Produces: `createChatHandler({ providerName: string | undefined }) => (req, res) => Promise<void>` (named export from `routes/chat.js`) — an Express-compatible handler. Expects `req.body.messages` to be a non-empty array of `{ role, content }`. Writes the reply as plain-text chunks via `res.write`, then `res.end()`.

- [ ] **Step 1: Write the failing test for the chat route**

Create `backend/test/chat.route.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createChatHandler } from '../src/routes/chat.js';

function createFakeRes() {
  const res = { statusCode: 200, headers: {}, chunks: [], ended: false, body: null };
  res.status = (code) => {
    res.statusCode = code;
    return res;
  };
  res.json = (body) => {
    res.body = body;
    res.ended = true;
  };
  res.setHeader = (name, value) => {
    res.headers[name] = value;
  };
  res.write = (chunk) => {
    res.chunks.push(chunk);
  };
  res.end = () => {
    res.ended = true;
  };
  return res;
}

test('responds 400 when messages is missing', async () => {
  const handler = createChatHandler({ providerName: 'mock' });
  const res = createFakeRes();
  await handler({ body: {} }, res);
  assert.equal(res.statusCode, 400);
  assert.ok(res.body.error);
});

test('responds 400 when messages is an empty array', async () => {
  const handler = createChatHandler({ providerName: 'mock' });
  const res = createFakeRes();
  await handler({ body: { messages: [] } }, res);
  assert.equal(res.statusCode, 400);
});

test('responds 503 when the configured provider is not available', async () => {
  const handler = createChatHandler({ providerName: 'nonexistent' });
  const res = createFakeRes();
  await handler({ body: { messages: [{ role: 'user', content: 'hi' }] } }, res);
  assert.equal(res.statusCode, 503);
  assert.ok(res.body.error);
});

test('streams chunks and ends the response when using the mock provider', async () => {
  const handler = createChatHandler({ providerName: 'mock' });
  const res = createFakeRes();
  await handler({ body: { messages: [{ role: 'user', content: 'what is 2+2' }] } }, res);
  assert.ok(res.chunks.length > 0);
  assert.ok(res.ended);
  assert.equal(res.headers['Content-Type'], 'text/plain; charset=utf-8');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && node --test test/chat.route.test.js`
Expected: FAIL — `Cannot find module '../src/routes/chat.js'`

- [ ] **Step 3: Implement the system prompt**

Create `backend/src/systemPrompt.js`:

```js
export const SYSTEM_PROMPT = `You are Ada, a friendly homework-helper chatbot embedded in LoveLaceLabs, \
an advanced calculator web app. You help students with homework questions across subjects, explaining \
your reasoning step by step rather than just giving a bare final answer.

You also know about this app's own features and can explain how to use them when asked:
- Calculator: a symbolic math keyboard supporting arithmetic, exponents, roots, logarithms, and more.
- Matrix operations: determinant, transpose, inverse, rank, trace, and matrix/vector arithmetic, \
available from the "Matrix" tab of the calculator keyboard.
- Trigonometric, calculus (derivatives, integrals, sums, products), and relational/set-notation symbol \
tabs are also available in the calculator keyboard.

Keep answers concise and encouraging. If a question is ambiguous, ask a brief clarifying question rather \
than guessing.`;
```

- [ ] **Step 4: Implement the chat route handler**

Create `backend/src/routes/chat.js`:

```js
import { getProvider } from '../providers/index.js';
import { SYSTEM_PROMPT } from '../systemPrompt.js';

export function createChatHandler({ providerName }) {
  return async function chatHandler(req, res) {
    const { messages } = req.body ?? {};

    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'Request must include a non-empty "messages" array.' });
      return;
    }

    const provider = getProvider(providerName);
    if (!provider) {
      res.status(503).json({
        error: "I'm not set up with an AI provider yet - ask your developer to configure AI_PROVIDER.",
      });
      return;
    }

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');

    try {
      for await (const chunk of provider.stream(messages, SYSTEM_PROMPT)) {
        res.write(chunk);
      }
    } finally {
      res.end();
    }
  };
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd backend && node --test test/chat.route.test.js`
Expected: PASS (4 tests)

- [ ] **Step 6: Implement the server bootstrap (no dedicated test — thin wiring only)**

Create `backend/src/server.js`:

```js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createChatHandler } from './routes/chat.js';
import { createRateLimiter } from './rateLimiter.js';

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(cors());
app.use(express.json());

const chatRateLimiter = createRateLimiter({ windowMs: 60_000, max: 20 });
app.post('/api/chat', chatRateLimiter, createChatHandler({ providerName: process.env.AI_PROVIDER }));

app.listen(PORT, () => {
  console.log(`Chatbot backend listening on http://localhost:${PORT}`);
});
```

- [ ] **Step 7: Run the full backend test suite**

Run: `cd backend && npm test`
Expected: PASS (12 tests total across providers, rateLimiter, chat.route)

- [ ] **Step 8: Commit**

```bash
git add backend/src/systemPrompt.js backend/src/routes/chat.js backend/src/server.js backend/test/chat.route.test.js
git commit -m "feat(chatbot-backend): add /api/chat route and server bootstrap"
```

---

### Task 6: Frontend streaming chat API client

**Files:**
- Create: `frontend/src/components/chatbot/chatApi.js`
- Test: `frontend/src/components/chatbot/chatApi.test.js`
- Create: `frontend/.env.example`

**Interfaces:**
- Produces: `class ChatApiError extends Error { status: number }` (named export)
- Produces: `sendChatMessage(messages: {role, content}[], { onChunk?: (text: string) => void }) => Promise<void>` (named export). Rejects with `ChatApiError` when the HTTP response is not ok.

- [ ] **Step 1: Document the API base URL env var**

Create `frontend/.env.example`:

```
VITE_CHATBOT_API_URL=http://localhost:3001
```

- [ ] **Step 2: Write the failing test**

Create `frontend/src/components/chatbot/chatApi.test.js`:

```js
import { describe, it, expect, vi, afterEach } from 'vitest';
import { sendChatMessage, ChatApiError } from './chatApi';

function mockStreamingResponse(chunks) {
  let index = 0;
  const encoder = new TextEncoder();
  return {
    ok: true,
    body: {
      getReader() {
        return {
          read() {
            if (index < chunks.length) {
              const value = encoder.encode(chunks[index]);
              index += 1;
              return Promise.resolve({ done: false, value });
            }
            return Promise.resolve({ done: true, value: undefined });
          },
        };
      },
    },
  };
}

describe('sendChatMessage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('invokes onChunk for each streamed chunk in order', async () => {
    global.fetch = vi.fn().mockResolvedValue(mockStreamingResponse(['Hello ', 'world']));
    const chunks = [];
    await sendChatMessage([{ role: 'user', content: 'hi' }], { onChunk: (c) => chunks.push(c) });
    expect(chunks).toEqual(['Hello ', 'world']);
  });

  it('sends the messages array as the JSON request body', async () => {
    const fetchMock = vi.fn().mockResolvedValue(mockStreamingResponse(['ok']));
    global.fetch = fetchMock;
    await sendChatMessage([{ role: 'user', content: 'hi' }]);
    const [, requestInit] = fetchMock.mock.calls[0];
    expect(JSON.parse(requestInit.body)).toEqual({ messages: [{ role: 'user', content: 'hi' }] });
  });

  it('throws a ChatApiError with the response status and server message when not ok', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: () => Promise.resolve({ error: 'not configured' }),
    });
    await expect(sendChatMessage([{ role: 'user', content: 'hi' }])).rejects.toMatchObject({
      status: 503,
      message: 'not configured',
    });
  });

  it('throws a ChatApiError instance', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: () => Promise.resolve({}),
    });
    await expect(sendChatMessage([{ role: 'user', content: 'hi' }])).rejects.toBeInstanceOf(ChatApiError);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/chatbot/chatApi.test.js`
Expected: FAIL — `Cannot find module './chatApi'`

- [ ] **Step 4: Implement `chatApi.js`**

Create `frontend/src/components/chatbot/chatApi.js`:

```js
const API_BASE = import.meta.env.VITE_CHATBOT_API_URL ?? 'http://localhost:3001';

export class ChatApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'ChatApiError';
    this.status = status;
  }
}

export async function sendChatMessage(messages, { onChunk } = {}) {
  const response = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new ChatApiError(body.error ?? `Request failed with status ${response.status}`, response.status);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    const text = decoder.decode(value, { stream: true });
    if (text) onChunk?.(text);
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/chatbot/chatApi.test.js`
Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add frontend/.env.example frontend/src/components/chatbot/chatApi.js frontend/src/components/chatbot/chatApi.test.js
git commit -m "feat(chatbot): add streaming chat API client"
```

---

### Task 7: Chat bubble component

**Files:**
- Create: `frontend/src/components/chatbot/ChatBubble.jsx`
- Test: `frontend/src/components/chatbot/ChatBubble.test.jsx`

**Interfaces:**
- Consumes: nothing from earlier tasks directly (receives `hasMovedRef` and `handlePointerDown` as props from whatever composes it in Task 9)
- Produces: `ChatBubble` default export, props: `{ position: {x,y}, onPointerDown: (e) => void, onOpen: () => void, onDismiss: () => void, hasMovedRef: { current: boolean } }`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/components/chatbot/ChatBubble.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatBubble from './ChatBubble';

function renderBubble(overrides = {}) {
  const props = {
    position: { x: 10, y: 20 },
    onPointerDown: vi.fn(),
    onOpen: vi.fn(),
    onDismiss: vi.fn(),
    hasMovedRef: { current: false },
    ...overrides,
  };
  render(<ChatBubble {...props} />);
  return props;
}

describe('ChatBubble', () => {
  it('calls onOpen when clicked without having dragged', () => {
    const props = renderBubble();
    fireEvent.click(screen.getByTitle('Chat with Ada'));
    expect(props.onOpen).toHaveBeenCalledTimes(1);
  });

  it('does not call onOpen when a drag occurred first', () => {
    const props = renderBubble({ hasMovedRef: { current: true } });
    fireEvent.click(screen.getByTitle('Chat with Ada'));
    expect(props.onOpen).not.toHaveBeenCalled();
  });

  it('calls onDismiss when the remove button is clicked', () => {
    const props = renderBubble();
    fireEvent.click(screen.getByTitle('Remove chatbot'));
    expect(props.onDismiss).toHaveBeenCalledTimes(1);
  });

  it('wires onPointerDown to the bubble for dragging', () => {
    const props = renderBubble();
    fireEvent.pointerDown(screen.getByTitle('Chat with Ada'));
    expect(props.onPointerDown).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/chatbot/ChatBubble.test.jsx`
Expected: FAIL — `Cannot find module './ChatBubble'`

- [ ] **Step 3: Implement `ChatBubble.jsx`**

Create `frontend/src/components/chatbot/ChatBubble.jsx`:

```jsx
const FACE = '◕‿◕';

export default function ChatBubble({ position, onPointerDown, onOpen, onDismiss, hasMovedRef }) {
  return (
    <div
      style={{ position: 'fixed', left: position.x, top: position.y, zIndex: 1000 }}
      className="flex flex-col items-center gap-1"
    >
      <div
        onPointerDown={onPointerDown}
        onClick={() => {
          if (!hasMovedRef.current) onOpen();
        }}
        title="Chat with Ada"
        className="w-14 h-14 rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing select-none shadow-[0_0_18px_rgba(52,211,153,0.35)]"
        style={{ background: '#122131', border: '2px solid #5af0b3' }}
      >
        <span style={{ color: '#5af0b3' }} className="text-lg">{FACE}</span>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        title="Remove chatbot"
        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-on-surface-variant hover:text-red-400 hover:bg-surface-container-high cursor-pointer"
      >
        ×
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/chatbot/ChatBubble.test.jsx`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/chatbot/ChatBubble.jsx frontend/src/components/chatbot/ChatBubble.test.jsx
git commit -m "feat(chatbot): add draggable mascot bubble component"
```

---

### Task 8: Chat panel component

**Files:**
- Create: `frontend/src/components/chatbot/ChatPanel.jsx`
- Test: `frontend/src/components/chatbot/ChatPanel.test.jsx`

**Interfaces:**
- Produces: `ChatPanel` default export, props: `{ position: {x,y}, messages: {id, role: 'user'|'assistant', content: string}[], onSend: (text: string) => void, isSending: boolean, error: string | null, onCollapse: () => void, onDismiss: () => void }`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/components/chatbot/ChatPanel.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import ChatPanel from './ChatPanel';

function renderPanel(overrides = {}) {
  const props = {
    position: { x: 0, y: 0 },
    messages: [],
    onSend: vi.fn(),
    isSending: false,
    error: null,
    onCollapse: vi.fn(),
    onDismiss: vi.fn(),
    ...overrides,
  };
  render(<ChatPanel {...props} />);
  return props;
}

describe('ChatPanel', () => {
  it('calls onSend with the typed text and clears the input', () => {
    const props = renderPanel();
    const input = screen.getByPlaceholderText('Ask Ada anything...');
    fireEvent.change(input, { target: { value: 'help with derivatives' } });
    fireEvent.click(screen.getByText('Send'));
    expect(props.onSend).toHaveBeenCalledWith('help with derivatives');
    expect(input.value).toBe('');
  });

  it('does not call onSend for an empty or whitespace-only message', () => {
    const props = renderPanel();
    const input = screen.getByPlaceholderText('Ask Ada anything...');
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.click(screen.getByText('Send'));
    expect(props.onSend).not.toHaveBeenCalled();
  });

  it('renders user and assistant messages', () => {
    renderPanel({
      messages: [
        { id: '1', role: 'user', content: 'hi' },
        { id: '2', role: 'assistant', content: 'hello!' },
      ],
    });
    expect(screen.getByText('hi')).toBeInTheDocument();
    expect(screen.getByText('hello!')).toBeInTheDocument();
  });

  it('shows the error banner when error is set', () => {
    renderPanel({ error: 'Something went wrong.' });
    expect(screen.getByText('Something went wrong.')).toBeInTheDocument();
  });

  it('calls onCollapse and onDismiss from the header buttons', () => {
    const props = renderPanel();
    fireEvent.click(screen.getByTitle('Minimize'));
    expect(props.onCollapse).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByTitle('Remove chatbot'));
    expect(props.onDismiss).toHaveBeenCalledTimes(1);
  });

  it('disables the send button while a message is in flight', () => {
    renderPanel({ isSending: true, messages: [{ id: '1', role: 'user', content: 'hi' }] });
    expect(screen.getByText('Send')).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/chatbot/ChatPanel.test.jsx`
Expected: FAIL — `Cannot find module './ChatPanel'`

- [ ] **Step 3: Implement `ChatPanel.jsx`**

Create `frontend/src/components/chatbot/ChatPanel.jsx`:

```jsx
import { useState } from 'react';

export default function ChatPanel({ position, messages, onSend, isSending, error, onCollapse, onDismiss }) {
  const [draft, setDraft] = useState('');

  function handleSubmit(e) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || isSending) return;
    onSend(text);
    setDraft('');
  }

  return (
    <div
      style={{ position: 'fixed', left: position.x, top: position.y, zIndex: 1000 }}
      className="w-80 h-[420px] flex flex-col rounded-2xl border border-primary/25 bg-surface-container-low/95 backdrop-blur-md overflow-hidden"
    >
      <div className="flex items-center justify-between px-3 py-2 border-b border-outline/20">
        <span className="text-sm font-bold text-primary">Ada</span>
        <div className="flex items-center gap-3">
          <button type="button" onClick={onCollapse} title="Minimize" className="text-on-surface-variant hover:text-primary cursor-pointer">
            _
          </button>
          <button type="button" onClick={onDismiss} title="Remove chatbot" className="text-on-surface-variant hover:text-red-400 cursor-pointer">
            ×
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 text-sm">
        {messages.map((message) => (
          <div
            key={message.id}
            className={
              message.role === 'user'
                ? 'ml-6 rounded-lg bg-primary/15 px-2 py-1'
                : 'mr-6 rounded-lg bg-surface-container-high px-2 py-1'
            }
          >
            {message.content || (message.role === 'assistant' && isSending ? '…' : '')}
          </div>
        ))}
        {error && <div className="mr-6 rounded-lg bg-red-500/15 text-red-400 px-2 py-1">{error}</div>}
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2 p-2 border-t border-outline/20">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask Ada anything..."
          className="flex-1 bg-transparent border border-outline/30 rounded-lg px-2 py-1 text-sm outline-none focus:border-primary/50"
        />
        <button
          type="submit"
          disabled={isSending || !draft.trim()}
          className="text-primary disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
        >
          Send
        </button>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/chatbot/ChatPanel.test.jsx`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/chatbot/ChatPanel.jsx frontend/src/components/chatbot/ChatPanel.test.jsx
git commit -m "feat(chatbot): add chat panel component"
```

---

### Task 9: Widget composition

**Files:**
- Create: `frontend/src/components/chatbot/ChatbotWidget.jsx`
- Test: `frontend/src/components/chatbot/ChatbotWidget.test.jsx`

**Interfaces:**
- Consumes: `usePersistedState` (Task 2), `useDraggable` (Task 1), `sendChatMessage`/`ChatApiError` (Task 6), `ChatBubble` (Task 7), `ChatPanel` (Task 8), `generateId` from `frontend/src/utils/mathTree.js` (existing)
- Produces: `ChatbotWidget` default export, props: `{ dismissed: boolean, onDismiss: () => void }`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/components/chatbot/ChatbotWidget.test.jsx`:

```jsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ChatbotWidget from './ChatbotWidget';
import * as chatApi from './chatApi';

describe('ChatbotWidget', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('renders nothing when dismissed', () => {
    const { container } = render(<ChatbotWidget dismissed={true} onDismiss={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the bubble by default when not dismissed', () => {
    render(<ChatbotWidget dismissed={false} onDismiss={vi.fn()} />);
    expect(screen.getByTitle('Chat with Ada')).toBeInTheDocument();
  });

  it('opens the panel when the bubble is clicked', () => {
    render(<ChatbotWidget dismissed={false} onDismiss={vi.fn()} />);
    fireEvent.click(screen.getByTitle('Chat with Ada'));
    expect(screen.getByPlaceholderText('Ask Ada anything...')).toBeInTheDocument();
  });

  it('calls onDismiss when dismissed from the bubble', () => {
    const onDismiss = vi.fn();
    render(<ChatbotWidget dismissed={false} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByTitle('Remove chatbot'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('sends a message and appends streamed chunks to the assistant reply', async () => {
    vi.spyOn(chatApi, 'sendChatMessage').mockImplementation(async (messages, { onChunk }) => {
      onChunk('Hello ');
      onChunk('there!');
    });
    render(<ChatbotWidget dismissed={false} onDismiss={vi.fn()} />);
    fireEvent.click(screen.getByTitle('Chat with Ada'));
    fireEvent.change(screen.getByPlaceholderText('Ask Ada anything...'), { target: { value: 'help me' } });
    fireEvent.click(screen.getByText('Send'));

    expect(await screen.findByText('help me')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Hello there!')).toBeInTheDocument());
  });

  it('shows a friendly message when the provider is not configured (503)', async () => {
    vi.spyOn(chatApi, 'sendChatMessage').mockRejectedValue(new chatApi.ChatApiError('not configured', 503));
    render(<ChatbotWidget dismissed={false} onDismiss={vi.fn()} />);
    fireEvent.click(screen.getByTitle('Chat with Ada'));
    fireEvent.change(screen.getByPlaceholderText('Ask Ada anything...'), { target: { value: 'help me' } });
    fireEvent.click(screen.getByText('Send'));

    expect(await screen.findByText(/not set up with an AI provider/)).toBeInTheDocument();
  });

  it('shows a friendly message when rate limited (429)', async () => {
    vi.spyOn(chatApi, 'sendChatMessage').mockRejectedValue(new chatApi.ChatApiError('rate limited', 429));
    render(<ChatbotWidget dismissed={false} onDismiss={vi.fn()} />);
    fireEvent.click(screen.getByTitle('Chat with Ada'));
    fireEvent.change(screen.getByPlaceholderText('Ask Ada anything...'), { target: { value: 'help me' } });
    fireEvent.click(screen.getByText('Send'));

    expect(await screen.findByText(/Slow down/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/chatbot/ChatbotWidget.test.jsx`
Expected: FAIL — `Cannot find module './ChatbotWidget'`

- [ ] **Step 3: Implement `ChatbotWidget.jsx`**

Create `frontend/src/components/chatbot/ChatbotWidget.jsx`:

```jsx
import { useState } from 'react';
import { generateId } from '../../utils/mathTree';
import { usePersistedState } from './usePersistedState';
import { useDraggable } from './useDraggable';
import { sendChatMessage, ChatApiError } from './chatApi';
import ChatBubble from './ChatBubble';
import ChatPanel from './ChatPanel';

const BUBBLE_SIZE = { width: 56, height: 76 };
const PANEL_SIZE = { width: 320, height: 420 };
const DEFAULT_POSITION = { x: 24, y: 120 };

export default function ChatbotWidget({ dismissed, onDismiss }) {
  const [position, setPosition] = usePersistedState('chatbot:position', DEFAULT_POSITION);
  const [panelOpen, setPanelOpen] = usePersistedState('chatbot:panelOpen', false);
  const [messages, setMessages] = usePersistedState('chatbot:messages', []);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);

  const { position: dragPosition, handlePointerDown, hasMovedRef } = useDraggable({
    initialPosition: position,
    size: panelOpen ? PANEL_SIZE : BUBBLE_SIZE,
    onDragEnd: setPosition,
  });

  if (dismissed) return null;

  async function handleSend(text) {
    const userMessage = { id: generateId(), role: 'user', content: text };
    const botMessageId = generateId();
    const history = [...messages, userMessage].map(({ role, content }) => ({ role, content }));

    setMessages((prev) => [...prev, userMessage, { id: botMessageId, role: 'assistant', content: '' }]);
    setError(null);
    setIsSending(true);

    try {
      await sendChatMessage(history, {
        onChunk: (chunk) => {
          setMessages((prev) =>
            prev.map((m) => (m.id === botMessageId ? { ...m, content: m.content + chunk } : m))
          );
        },
      });
    } catch (err) {
      if (err instanceof ChatApiError && err.status === 503) {
        setError("I'm not set up with an AI provider yet — ask your developer to configure one.");
      } else if (err instanceof ChatApiError && err.status === 429) {
        setError("Slow down, you've sent a lot of messages — try again in a minute.");
      } else {
        setError("Sorry, I couldn't reach my brain right now — try again in a moment.");
      }
    } finally {
      setIsSending(false);
    }
  }

  if (panelOpen) {
    return (
      <ChatPanel
        position={dragPosition}
        messages={messages}
        onSend={handleSend}
        isSending={isSending}
        error={error}
        onCollapse={() => setPanelOpen(false)}
        onDismiss={onDismiss}
      />
    );
  }

  return (
    <ChatBubble
      position={dragPosition}
      onPointerDown={handlePointerDown}
      onOpen={() => setPanelOpen(true)}
      onDismiss={onDismiss}
      hasMovedRef={hasMovedRef}
    />
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/chatbot/ChatbotWidget.test.jsx`
Expected: PASS (7 tests)

- [ ] **Step 5: Run the full frontend test suite**

Run: `cd frontend && npm test`
Expected: PASS (all chatbot test files, ~26 tests total)

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/chatbot/ChatbotWidget.jsx frontend/src/components/chatbot/ChatbotWidget.test.jsx
git commit -m "feat(chatbot): compose bubble, panel, drag, and persistence into ChatbotWidget"
```

---

### Task 10: Mount the widget and add the Sidebar re-summon entry

**Files:**
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/src/components/layout/Sidebar.jsx`

**Interfaces:**
- Consumes: `ChatbotWidget` (Task 9), `usePersistedState` (Task 2)

- [ ] **Step 1: Mount `ChatbotWidget` in `App.jsx` and lift dismissed-state**

Modify `frontend/src/App.jsx` to:

```jsx
import { useState } from 'react';
import './index.css';
import Sidebar from './components/layout/Sidebar';
import TopAppBar from './components/layout/TopAppBar';
import IntelligenceHub from './components/dashboard/IntelligenceHub';
import ChatbotWidget from './components/chatbot/ChatbotWidget';
import { usePersistedState } from './components/chatbot/usePersistedState';

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatbotDismissed, setChatbotDismissed] = usePersistedState('chatbot:dismissed', false);

  return (
    <div className="min-h-screen bg-background text-on-surface">
      <Sidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((v) => !v)}
        chatbotDismissed={chatbotDismissed}
        onRestoreChatbot={() => setChatbotDismissed(false)}
      />

      <main
        className="min-h-screen blueprint-grid transition-all duration-300"
        style={{ marginLeft: sidebarOpen ? '208px' : '64px' }}
      >
        <TopAppBar sidebarOpen={sidebarOpen} />

        <div className="flex flex-col items-center justify-center min-h-screen px-6 py-20">
          <IntelligenceHub />
        </div>
      </main>

      <ChatbotWidget dismissed={chatbotDismissed} onDismiss={() => setChatbotDismissed(true)} />
    </div>
  );
}
```

- [ ] **Step 2: Add the re-summon entry to `Sidebar.jsx`**

Modify `frontend/src/components/layout/Sidebar.jsx`:

1. Change the export signature (currently line 46) from:

```jsx
export default function Sidebar({ open, onToggle }) {
```

to:

```jsx
export default function Sidebar({ open, onToggle, chatbotDismissed, onRestoreChatbot }) {
```

2. In the "Bottom actions" block (currently lines 77-116), insert a new button right after the Support link (after line 93, before the "Collapse toggle" comment on line 95):

```jsx
        {chatbotDismissed && (
          <button
            onClick={onRestoreChatbot}
            title={!open ? 'Show Ada' : undefined}
            className={`w-full flex items-center gap-3 py-2 text-on-surface-variant hover:text-primary transition-colors text-[11px] tracking-[0.05em] font-bold font-mono uppercase cursor-pointer ${open ? 'px-4' : 'justify-center px-2'}`}
          >
            <span className="w-5 h-5 flex items-center justify-center shrink-0 text-[13px]">◕‿◕</span>
            {open && <span>Show Ada</span>}
          </button>
        )}
```

- [ ] **Step 3: Run the full frontend test suite to confirm nothing broke**

Run: `cd frontend && npm test`
Expected: PASS (no regressions; App.jsx and Sidebar.jsx have no existing tests to run, this confirms the chatbot test files are still green after the wiring change)

- [ ] **Step 4: Run lint**

Run: `cd frontend && npm run lint`
Expected: no errors

- [ ] **Step 5: Commit**

```bash
git add frontend/src/App.jsx frontend/src/components/layout/Sidebar.jsx
git commit -m "feat(chatbot): mount widget in App and add sidebar re-summon entry"
```

---

### Task 11: End-to-end manual verification

**Files:** none (manual verification only)

- [ ] **Step 1: Configure and start the backend**

```bash
cd backend
cp .env.example .env
npm start
```
Expected console output: `Chatbot backend listening on http://localhost:3001`

- [ ] **Step 2: Start the frontend**

```bash
cd frontend
npm run dev
```
Expected: Vite dev server prints a local URL (e.g. `http://localhost:5173`).

- [ ] **Step 3: Walk through the acceptance checklist in a browser**

Open the printed frontend URL and verify each of the following:

- [ ] A mascot bubble appears near the left side of the screen on load.
- [ ] Dragging the bubble by holding and moving the mouse relocates it, and it cannot be dragged fully off-screen (try dragging to each edge/corner).
- [ ] Clicking the bubble (without dragging) opens the chat panel anchored near the bubble.
- [ ] Typing a message and clicking Send shows the user's message immediately, then a streamed reply from Ada appears progressively (mock provider streams word-by-word).
- [ ] Reloading the page keeps the conversation history and the widget's last position (open/closed state persists too).
- [ ] Clicking the X removes the widget entirely.
- [ ] After removal, a "Show Ada" entry appears in the left Sidebar; clicking it brings the bubble back at its last position.
- [ ] Stop the backend process (Ctrl+C) and send a message — the panel shows "Sorry, I couldn't reach my brain right now" rather than crashing.
- [ ] Restart the backend, edit `backend/.env` to set `AI_PROVIDER=` (empty) or an unrecognized value, restart, and send a message — the panel shows the "not set up with an AI provider yet" message (HTTP 503 path).
- [ ] Restore `AI_PROVIDER=mock` in `backend/.env`, restart the backend, and send more than 20 messages within a minute — later ones show the "Slow down" rate-limit message (HTTP 429 path).

- [ ] **Step 4: Record any issues found and fix before considering the prototype complete**

If any checklist item fails, fix the underlying code (in the relevant task's files) and re-run that task's automated tests plus this manual checklist again before moving on.

---

## Self-Review Notes

- **Spec coverage:** draggable/dismissible bubble (Tasks 1, 7), open/closed persistence (Tasks 2, 9), chat panel (Task 8), backend proxy + streaming (Tasks 3, 5), provider abstraction (Task 3), rate limiting (Task 4), message-history persistence (Tasks 2, 9), Sidebar re-summon (Task 10), error handling for unreachable/unconfigured/rate-limited (Task 9, verified in Task 11), CORS (Task 5's `server.js`), `.env`/`.env.example` (Tasks 3, 6). All spec sections are covered.
- **Type consistency checked:** `ChatApiError` (Task 6) is the same class referenced in `ChatbotWidget.jsx` (Task 9). `getProvider` (Task 3) signature matches its usage in `routes/chat.js` (Task 5). `usePersistedState` return shape (Task 2) matches its three usages in Task 9 and Task 10. `useDraggable`'s returned `hasMovedRef`/`handlePointerDown`/`position` (Task 1) match the props `ChatBubble` (Task 7) expects, as wired in Task 9.
- **No placeholders:** every step contains complete, runnable code; no "TBD" or "add error handling here" style steps remain.
