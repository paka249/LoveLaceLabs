# Google OAuth Login Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add "Sign in with Google" to LovelaceLabs — calculator/Ada stay usable with zero login, sign-in is opt-in, and it stands up the SQLite/Knex `users` table the chat-history spec called for but never built.

**Architecture:** Frontend uses `@react-oauth/google` to get a Google ID token; backend verifies it with `google-auth-library`, upserts a `users` row via Knex/SQLite, and issues its own JWT as an httpOnly cookie. The frontend never handles a token directly — it just asks the backend "am I logged in?" via a cookie-authenticated `GET /api/auth/me`.

**Tech Stack:** Express, Knex, better-sqlite3, google-auth-library, jsonwebtoken, cookie-parser (backend); React, react-router-dom, @react-oauth/google (frontend). All chosen to match what's already installed or documented in the spec.

## Global Constraints

- Client ID is public (safe in frontend code/env); Client Secret and `SESSION_SECRET` must only ever live in gitignored `.env` files, never in `.env.example` or committed code.
- Backend tests use `node:test` + `node:assert/strict`, with dependency injection for anything that calls an external service (matches `providers/gemini.js`'s `fetchImpl` pattern) — no real network calls or real Google tokens in tests.
- Frontend tests use Vitest + Testing Library, mocking `fetch` (matches `chatApi.test.js`).
- Nothing in the app becomes login-required by this plan — `requireAuth` middleware is built and tested but not attached to any route yet.
- Session cookie: httpOnly, `SameSite=Lax`, `Secure` only when `NODE_ENV=production`, ~7 day expiry.

---

## File Structure

**Backend — new:**
- `backend/knexfile.js` — Knex config (client `better-sqlite3`, migrations directory).
- `backend/src/db/index.js` — exports the configured Knex instance (`db`) other modules query through.
- `backend/src/db/migrations/20260718120000_create_users.js` — creates the `users` table.
- `backend/src/auth/session.js` — signs/verifies our own JWT, sets/reads/clears the session cookie.
- `backend/src/auth/verifyGoogleToken.js` — wraps `google-auth-library`, verifies a Google ID token.
- `backend/src/auth/requireAuth.js` — Express middleware; reads the session cookie, attaches `req.userId`, or `401`s.
- `backend/src/routes/auth.js` — three handler factories: `createGoogleLoginHandler`, `createMeHandler`, `createLogoutHandler`.
- `backend/test/testDb.js` — test helper: creates an in-memory Knex instance with migrations applied.
- `backend/test/session.test.js`, `backend/test/verifyGoogleToken.test.js`, `backend/test/requireAuth.test.js`, `backend/test/auth.route.test.js`, `backend/test/db.migration.test.js`.

**Backend — modified:**
- `backend/src/server.js` — add `cookie-parser`, CORS `credentials: true`, mount the three auth routes, run migrations on boot.
- `backend/.env.example` / `backend/.env` — add `SESSION_SECRET`.
- `backend/.gitignore` — ignore the SQLite data file.

**Frontend — new:**
- `frontend/src/auth/AuthContext.jsx` — `AuthProvider` + `useAuth()` hook.
- `frontend/src/auth/AuthContext.test.jsx`
- `frontend/src/pages/Login.jsx` — the real login page.
- `frontend/src/pages/Login.test.jsx`
- `frontend/src/components/layout/TopAppBar.test.jsx`

**Frontend — modified:**
- `frontend/src/components/layout/TopAppBar.jsx` — decorative account icon becomes a real sign-in link / avatar+logout menu.
- `frontend/src/App.jsx` — wraps the app in `GoogleOAuthProvider` / `AuthProvider` / `BrowserRouter`, adds a `/login` route.
- `frontend/.env.example` — add `VITE_GOOGLE_CLIENT_ID`.
- `frontend/.env` — create, with the real Client ID (public value, fine to write directly).
- `frontend/.gitignore` — add `.env` (currently missing entirely — a gap worth closing now, before this feature adds a reason to have one).

---

### Task 1: Database layer — Knex + SQLite + `users` migration

**Files:**
- Create: `backend/knexfile.js`
- Create: `backend/src/db/index.js`
- Create: `backend/src/db/migrations/20260718120000_create_users.js`
- Create: `backend/test/testDb.js`
- Create: `backend/test/db.migration.test.js`

**Interfaces:**
- Produces: `db` (named export of `backend/src/db/index.js`, consumed elsewhere as `import { db } from './db/index.js'` — see Task 5) — a Knex instance, queryable as `db('users')...`.
- Produces: `createTestDb()` (named export of `backend/test/testDb.js`) — returns `{ db, cleanup }` where `db` is an in-memory Knex instance with migrations already applied, and `cleanup()` closes it. Signature: `async function createTestDb(): Promise<{ db: Knex, cleanup: () => Promise<void> }>`.
- `users` table columns: `id` (string, primary key), `google_id` (string, unique, not null), `email` (string, not null), `name` (string, not null), `picture_url` (string, nullable), `created_at` (timestamp, defaults to now).

- [ ] **Step 1: Install dependencies**

Run: `cd backend && npm install knex better-sqlite3`

- [ ] **Step 2: Write the test helper, `backend/test/testDb.js`**

This doesn't depend on `knexfile.js` or `src/db/index.js` — it points directly at the migrations directory, so it can be written before either of those exist.

```js
import knex from 'knex';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const migrationsDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'src',
  'db',
  'migrations'
);

export async function createTestDb() {
  const db = knex({
    client: 'better-sqlite3',
    connection: { filename: ':memory:' },
    useNullAsDefault: true,
    migrations: { directory: migrationsDir },
  });
  await db.migrate.latest();
  return { db, cleanup: () => db.destroy() };
}
```

- [ ] **Step 3: Write the failing test, `backend/test/db.migration.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTestDb } from './testDb.js';

test('users table exists with the expected columns after migration', async () => {
  const { db, cleanup } = await createTestDb();
  try {
    const hasTable = await db.schema.hasTable('users');
    assert.equal(hasTable, true);

    for (const column of ['id', 'google_id', 'email', 'name', 'picture_url', 'created_at']) {
      const hasColumn = await db.schema.hasColumn('users', column);
      assert.equal(hasColumn, true, `expected column "${column}" to exist`);
    }
  } finally {
    await cleanup();
  }
});

test('google_id must be unique', async () => {
  const { db, cleanup } = await createTestDb();
  try {
    await db('users').insert({
      id: 'user-1',
      google_id: 'g-1',
      email: 'a@example.com',
      name: 'A',
    });

    await assert.rejects(() =>
      db('users').insert({
        id: 'user-2',
        google_id: 'g-1',
        email: 'b@example.com',
        name: 'B',
      })
    );
  } finally {
    await cleanup();
  }
});
```

- [ ] **Step 4: Run the test to verify it fails**

Run: `cd backend && node --test test/db.migration.test.js`
Expected: FAIL — the migrations directory doesn't exist yet, so `hasTable('users')` is `false`.

- [ ] **Step 5: Write `backend/knexfile.js`**

```js
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default {
  client: 'better-sqlite3',
  connection: {
    filename: process.env.SQLITE_FILE ?? path.join(__dirname, 'dev.sqlite3'),
  },
  useNullAsDefault: true,
  migrations: {
    directory: path.join(__dirname, 'src', 'db', 'migrations'),
  },
};
```

- [ ] **Step 6: Write `backend/src/db/index.js`**

```js
import knex from 'knex';
import knexConfig from '../../knexfile.js';

export const db = knex(knexConfig);
```

- [ ] **Step 7: Write the migration, `backend/src/db/migrations/20260718120000_create_users.js`**

```js
export async function up(knex) {
  await knex.schema.createTable('users', (table) => {
    table.string('id').primary();
    table.string('google_id').notNullable().unique();
    table.string('email').notNullable();
    table.string('name').notNullable();
    table.string('picture_url');
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
}

export async function down(knex) {
  await knex.schema.dropTable('users');
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `cd backend && node --test test/db.migration.test.js`
Expected: PASS (2 tests)

- [ ] **Step 9: Add the SQLite data file to `.gitignore`**

Edit `backend/.gitignore`, add a third line:

```
node_modules/
.env
dev.sqlite3
```

- [ ] **Step 10: Commit**

```bash
git add backend/knexfile.js backend/src/db/index.js backend/src/db/migrations backend/test/testDb.js backend/test/db.migration.test.js backend/.gitignore backend/package.json backend/package-lock.json
git commit -m "feat(auth): add Knex/SQLite users table and migration"
```

---

### Task 2: Session module — sign/verify JWT, cookie helpers

**Files:**
- Create: `backend/src/auth/session.js`
- Create: `backend/test/session.test.js`
- Modify: `backend/.env.example`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces (named exports of `backend/src/auth/session.js`):
  - `createSessionToken(userId: string): string` — signs a JWT with `{ sub: userId }`, 7 day expiry.
  - `verifySessionToken(token: string): string | null` — returns the `userId` (the `sub` claim) if valid, `null` if invalid/expired.
  - `setSessionCookie(res, token: string): void` — sets the `session` cookie via `res.cookie(...)`.
  - `clearSessionCookie(res): void` — clears the `session` cookie via `res.clearCookie(...)`.
  - `getSessionToken(req): string | null` — reads `req.cookies.session`, requires `cookie-parser` to already be mounted.

- [ ] **Step 1: Install dependencies**

Run: `cd backend && npm install jsonwebtoken cookie-parser`

- [ ] **Step 2: Generate a session secret and add it to `backend/.env`**

Run: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

Copy the output and add this line to `backend/.env` (create the file's `SESSION_SECRET=` line — do not put the actual value in `.env.example`):

```
SESSION_SECRET=<paste the generated value here>
```

- [ ] **Step 3: Add the placeholder to `backend/.env.example`**

Add after the existing `GOOGLE_CLIENT_SECRET=` line:

```
# Secret used to sign our own session JWTs. Generate one with:
#   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Never commit a real value here - this file is the template, not the real .env.
SESSION_SECRET=
```

- [ ] **Step 4: Write the failing test, `backend/test/session.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.SESSION_SECRET = 'test-secret-do-not-use-in-prod';

const {
  createSessionToken,
  verifySessionToken,
  setSessionCookie,
  clearSessionCookie,
  getSessionToken,
} = await import('../src/auth/session.js');

test('createSessionToken then verifySessionToken round-trips the user id', () => {
  const token = createSessionToken('user-123');
  assert.equal(verifySessionToken(token), 'user-123');
});

test('verifySessionToken returns null for a garbage token', () => {
  assert.equal(verifySessionToken('not-a-real-token'), null);
});

test('verifySessionToken returns null for a token signed with a different secret', async () => {
  const jwt = (await import('jsonwebtoken')).default;
  const foreignToken = jwt.sign({ sub: 'user-123' }, 'wrong-secret');
  assert.equal(verifySessionToken(foreignToken), null);
});

test('setSessionCookie sets an httpOnly cookie named "session"', () => {
  let capturedName;
  let capturedValue;
  let capturedOptions;
  const fakeRes = {
    cookie: (name, value, options) => {
      capturedName = name;
      capturedValue = value;
      capturedOptions = options;
    },
  };

  setSessionCookie(fakeRes, 'the-token');

  assert.equal(capturedName, 'session');
  assert.equal(capturedValue, 'the-token');
  assert.equal(capturedOptions.httpOnly, true);
  assert.equal(capturedOptions.sameSite, 'lax');
});

test('clearSessionCookie clears the "session" cookie', () => {
  let cleared;
  const fakeRes = { clearCookie: (name) => { cleared = name; } };
  clearSessionCookie(fakeRes);
  assert.equal(cleared, 'session');
});

test('getSessionToken reads the session cookie from req.cookies', () => {
  assert.equal(getSessionToken({ cookies: { session: 'abc' } }), 'abc');
  assert.equal(getSessionToken({ cookies: {} }), null);
  assert.equal(getSessionToken({}), null);
});
```

- [ ] **Step 5: Run the test to verify it fails**

Run: `cd backend && node --test test/session.test.js`
Expected: FAIL — `Cannot find module '../src/auth/session.js'`

- [ ] **Step 6: Write `backend/src/auth/session.js`**

```js
import jwt from 'jsonwebtoken';

const COOKIE_NAME = 'session';
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('SESSION_SECRET is not set');
  return secret;
}

export function createSessionToken(userId) {
  return jwt.sign({ sub: userId }, getSecret(), { expiresIn: '7d' });
}

export function verifySessionToken(token) {
  try {
    const payload = jwt.verify(token, getSecret());
    return payload.sub;
  } catch {
    return null;
  }
}

export function setSessionCookie(res, token) {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: SESSION_DURATION_MS,
  });
}

export function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME);
}

export function getSessionToken(req) {
  return req.cookies?.[COOKIE_NAME] ?? null;
}
```

- [ ] **Step 7: Run the test to verify it passes**

Run: `cd backend && node --test test/session.test.js`
Expected: PASS (6 tests)

- [ ] **Step 8: Commit**

```bash
git add backend/src/auth/session.js backend/test/session.test.js backend/.env.example backend/package.json backend/package-lock.json
git commit -m "feat(auth): add session JWT signing/verification and cookie helpers"
```

(`backend/.env` is gitignored and won't be staged — that's expected, it stays local.)

---

### Task 3: Google token verification

**Files:**
- Create: `backend/src/auth/verifyGoogleToken.js`
- Create: `backend/test/verifyGoogleToken.test.js`

**Interfaces:**
- Consumes: nothing from other tasks (reads `process.env.GOOGLE_CLIENT_ID` directly).
- Produces: `verifyGoogleToken(credential: string, opts?: { verifyIdToken?: (credential, clientId) => Promise<object> }): Promise<{ googleId: string, email: string, name: string, pictureUrl: string | null }>` — throws if the client ID isn't configured, verification fails, or the payload is missing `sub`/`email`.

- [ ] **Step 1: Install dependency**

Run: `cd backend && npm install google-auth-library`

- [ ] **Step 2: Write the failing test, `backend/test/verifyGoogleToken.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { verifyGoogleToken } from '../src/auth/verifyGoogleToken.js';

test('returns a normalized profile on a valid token', async () => {
  const original = process.env.GOOGLE_CLIENT_ID;
  process.env.GOOGLE_CLIENT_ID = 'test-client-id';
  try {
    const fakeVerify = async (credential, clientId) => {
      assert.equal(credential, 'the-credential');
      assert.equal(clientId, 'test-client-id');
      return { sub: 'g-123', email: 'a@example.com', name: 'Ada', picture: 'http://pic' };
    };

    const profile = await verifyGoogleToken('the-credential', { verifyIdToken: fakeVerify });
    assert.deepEqual(profile, {
      googleId: 'g-123',
      email: 'a@example.com',
      name: 'Ada',
      pictureUrl: 'http://pic',
    });
  } finally {
    if (original === undefined) delete process.env.GOOGLE_CLIENT_ID;
    else process.env.GOOGLE_CLIENT_ID = original;
  }
});

test('falls back to email when the payload has no name, and null when no picture', async () => {
  process.env.GOOGLE_CLIENT_ID = 'test-client-id';
  const fakeVerify = async () => ({ sub: 'g-123', email: 'a@example.com' });
  const profile = await verifyGoogleToken('cred', { verifyIdToken: fakeVerify });
  assert.equal(profile.name, 'a@example.com');
  assert.equal(profile.pictureUrl, null);
});

test('throws if GOOGLE_CLIENT_ID is not configured', async () => {
  const original = process.env.GOOGLE_CLIENT_ID;
  delete process.env.GOOGLE_CLIENT_ID;
  try {
    await assert.rejects(
      () => verifyGoogleToken('cred', { verifyIdToken: async () => ({}) }),
      /GOOGLE_CLIENT_ID/
    );
  } finally {
    if (original !== undefined) process.env.GOOGLE_CLIENT_ID = original;
  }
});

test('throws when the verifier itself throws (invalid/expired/tampered token)', async () => {
  process.env.GOOGLE_CLIENT_ID = 'test-client-id';
  const fakeVerify = async () => {
    throw new Error('Token used too late');
  };
  await assert.rejects(() => verifyGoogleToken('cred', { verifyIdToken: fakeVerify }));
});

test('throws when the payload is missing required fields', async () => {
  process.env.GOOGLE_CLIENT_ID = 'test-client-id';
  const fakeVerify = async () => ({ sub: 'g-123' }); // no email
  await assert.rejects(() => verifyGoogleToken('cred', { verifyIdToken: fakeVerify }));
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd backend && node --test test/verifyGoogleToken.test.js`
Expected: FAIL — `Cannot find module '../src/auth/verifyGoogleToken.js'`

- [ ] **Step 4: Write `backend/src/auth/verifyGoogleToken.js`**

```js
import { OAuth2Client } from 'google-auth-library';

async function defaultVerifyIdToken(credential, clientId) {
  const client = new OAuth2Client(clientId);
  const ticket = await client.verifyIdToken({ idToken: credential, audience: clientId });
  return ticket.getPayload();
}

export async function verifyGoogleToken(credential, { verifyIdToken = defaultVerifyIdToken } = {}) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) throw new Error('GOOGLE_CLIENT_ID is not set');

  const payload = await verifyIdToken(credential, clientId);
  if (!payload?.sub || !payload?.email) {
    throw new Error('Google token payload is missing required fields');
  }

  return {
    googleId: payload.sub,
    email: payload.email,
    name: payload.name ?? payload.email,
    pictureUrl: payload.picture ?? null,
  };
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd backend && node --test test/verifyGoogleToken.test.js`
Expected: PASS (5 tests)

- [ ] **Step 6: Commit**

```bash
git add backend/src/auth/verifyGoogleToken.js backend/test/verifyGoogleToken.test.js backend/package.json backend/package-lock.json
git commit -m "feat(auth): verify Google ID tokens via google-auth-library"
```

---

### Task 4: `requireAuth` middleware

**Files:**
- Create: `backend/src/auth/requireAuth.js`
- Create: `backend/test/requireAuth.test.js`

**Interfaces:**
- Consumes: `getSessionToken`, `verifySessionToken` from `backend/src/auth/session.js` (Task 2).
- Produces: `requireAuth(req, res, next)` — Express middleware. On success sets `req.userId` and calls `next()`. On failure responds `401` with `{ error: string }` and does not call `next()`. Not wired into `server.js` this pass — no route needs it yet.

- [ ] **Step 1: Write the failing test, `backend/test/requireAuth.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';

process.env.SESSION_SECRET = 'test-secret-do-not-use-in-prod';

const { createSessionToken } = await import('../src/auth/session.js');
const { requireAuth } = await import('../src/auth/requireAuth.js');

function createFakeRes() {
  const res = { statusCode: 200, body: null };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; };
  return res;
}

test('calls next() and sets req.userId when the session cookie is valid', () => {
  const token = createSessionToken('user-123');
  const req = { cookies: { session: token } };
  const res = createFakeRes();
  let nextCalled = false;

  requireAuth(req, res, () => { nextCalled = true; });

  assert.equal(nextCalled, true);
  assert.equal(req.userId, 'user-123');
});

test('responds 401 and does not call next() when there is no session cookie', () => {
  const req = { cookies: {} };
  const res = createFakeRes();
  let nextCalled = false;

  requireAuth(req, res, () => { nextCalled = true; });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
  assert.ok(res.body.error);
});

test('responds 401 when the session cookie is invalid', () => {
  const req = { cookies: { session: 'garbage' } };
  const res = createFakeRes();
  let nextCalled = false;

  requireAuth(req, res, () => { nextCalled = true; });

  assert.equal(nextCalled, false);
  assert.equal(res.statusCode, 401);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd backend && node --test test/requireAuth.test.js`
Expected: FAIL — `Cannot find module '../src/auth/requireAuth.js'`

- [ ] **Step 3: Write `backend/src/auth/requireAuth.js`**

```js
import { getSessionToken, verifySessionToken } from './session.js';

export function requireAuth(req, res, next) {
  const token = getSessionToken(req);
  const userId = token ? verifySessionToken(token) : null;

  if (!userId) {
    res.status(401).json({ error: 'Not signed in.' });
    return;
  }

  req.userId = userId;
  next();
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd backend && node --test test/requireAuth.test.js`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add backend/src/auth/requireAuth.js backend/test/requireAuth.test.js
git commit -m "feat(auth): add requireAuth middleware (not yet wired to any route)"
```

---

### Task 5: Auth routes + wire into `server.js`

**Files:**
- Create: `backend/src/routes/auth.js`
- Create: `backend/test/auth.route.test.js`
- Modify: `backend/src/server.js`

**Interfaces:**
- Consumes: `db` (Task 1), `createSessionToken`/`setSessionCookie`/`clearSessionCookie`/`getSessionToken`/`verifySessionToken` (Task 2), `verifyGoogleToken` (Task 3).
- Produces (named exports of `backend/src/routes/auth.js`):
  - `createGoogleLoginHandler({ db, verify? }): (req, res) => Promise<void>` — `verify` defaults to `verifyGoogleToken`, injectable for tests.
  - `createMeHandler({ db }): (req, res) => Promise<void>`
  - `createLogoutHandler(): (req, res) => void`
- Public user shape returned by all three (on success): `{ id, email, name, pictureUrl }`.

- [ ] **Step 1: Write the failing test, `backend/test/auth.route.test.js`**

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createTestDb } from './testDb.js';

process.env.SESSION_SECRET = 'test-secret-do-not-use-in-prod';

const { createGoogleLoginHandler, createMeHandler, createLogoutHandler } = await import(
  '../src/routes/auth.js'
);
const { getSessionToken } = await import('../src/auth/session.js');

function createFakeRes() {
  const res = { statusCode: 200, body: null, cookies: {}, clearedCookies: [] };
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (body) => { res.body = body; return res; };
  res.cookie = (name, value) => { res.cookies[name] = value; };
  res.clearCookie = (name) => { res.clearedCookies.push(name); };
  res.end = () => {};
  return res;
}

test('POST /api/auth/google creates a new user, sets a session cookie, returns the profile', async () => {
  const { db, cleanup } = await createTestDb();
  try {
    const fakeVerify = async () => ({
      googleId: 'g-1',
      email: 'a@example.com',
      name: 'Ada',
      pictureUrl: 'http://pic',
    });
    const handler = createGoogleLoginHandler({ db, verify: fakeVerify });
    const req = { body: { credential: 'anything' } };
    const res = createFakeRes();

    await handler(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.email, 'a@example.com');
    assert.equal(res.body.name, 'Ada');
    assert.ok(res.cookies.session);

    const row = await db('users').where({ google_id: 'g-1' }).first();
    assert.ok(row);
    assert.equal(row.email, 'a@example.com');
  } finally {
    await cleanup();
  }
});

test('POST /api/auth/google logs in an existing user without creating a duplicate row', async () => {
  const { db, cleanup } = await createTestDb();
  try {
    await db('users').insert({
      id: 'existing-id',
      google_id: 'g-1',
      email: 'a@example.com',
      name: 'Ada',
    });

    const fakeVerify = async () => ({
      googleId: 'g-1',
      email: 'a@example.com',
      name: 'Ada',
      pictureUrl: null,
    });
    const handler = createGoogleLoginHandler({ db, verify: fakeVerify });
    const res = createFakeRes();

    await handler({ body: { credential: 'anything' } }, res);

    assert.equal(res.body.id, 'existing-id');
    const count = await db('users').where({ google_id: 'g-1' }).count({ c: '*' }).first();
    assert.equal(Number(count.c), 1);
  } finally {
    await cleanup();
  }
});

test('POST /api/auth/google responds 400 when credential is missing', async () => {
  const { db, cleanup } = await createTestDb();
  try {
    const handler = createGoogleLoginHandler({ db, verify: async () => ({}) });
    const res = createFakeRes();
    await handler({ body: {} }, res);
    assert.equal(res.statusCode, 400);
  } finally {
    await cleanup();
  }
});

test('POST /api/auth/google responds 401 when verification fails', async () => {
  const { db, cleanup } = await createTestDb();
  try {
    const handler = createGoogleLoginHandler({
      db,
      verify: async () => { throw new Error('bad token'); },
    });
    const res = createFakeRes();
    await handler({ body: { credential: 'bad' } }, res);
    assert.equal(res.statusCode, 401);
  } finally {
    await cleanup();
  }
});

test('GET /api/auth/me returns the profile for a valid session cookie', async () => {
  const { db, cleanup } = await createTestDb();
  try {
    await db('users').insert({
      id: 'user-1',
      google_id: 'g-1',
      email: 'a@example.com',
      name: 'Ada',
      picture_url: 'http://pic',
    });

    const loginRes = createFakeRes();
    await createGoogleLoginHandler({ db, verify: async () => ({ googleId: 'g-1', email: 'a@example.com', name: 'Ada', pictureUrl: 'http://pic' }) })(
      { body: { credential: 'anything' } },
      loginRes
    );
    const token = loginRes.cookies.session;

    const meHandler = createMeHandler({ db });
    const req = { cookies: { session: token } };
    const res = createFakeRes();
    await meHandler(req, res);

    assert.equal(res.statusCode, 200);
    assert.equal(res.body.email, 'a@example.com');
  } finally {
    await cleanup();
  }
});

test('GET /api/auth/me responds 401 when there is no session cookie', async () => {
  const { db, cleanup } = await createTestDb();
  try {
    const meHandler = createMeHandler({ db });
    const res = createFakeRes();
    await meHandler({ cookies: {} }, res);
    assert.equal(res.statusCode, 401);
  } finally {
    await cleanup();
  }
});

test('POST /api/auth/logout clears the session cookie', async () => {
  const handler = createLogoutHandler();
  const res = createFakeRes();
  handler({}, res);
  assert.ok(res.clearedCookies.includes('session'));
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd backend && node --test test/auth.route.test.js`
Expected: FAIL — `Cannot find module '../src/routes/auth.js'`

- [ ] **Step 3: Write `backend/src/routes/auth.js`**

```js
import { randomUUID } from 'node:crypto';
import { verifyGoogleToken } from '../auth/verifyGoogleToken.js';
import {
  createSessionToken,
  setSessionCookie,
  clearSessionCookie,
  getSessionToken,
  verifySessionToken,
} from '../auth/session.js';

async function findOrCreateUser(db, profile) {
  const existing = await db('users').where({ google_id: profile.googleId }).first();
  if (existing) return existing;

  const user = {
    id: randomUUID(),
    google_id: profile.googleId,
    email: profile.email,
    name: profile.name,
    picture_url: profile.pictureUrl,
  };
  await db('users').insert(user);
  return user;
}

function toPublicUser(user) {
  return { id: user.id, email: user.email, name: user.name, pictureUrl: user.picture_url };
}

export function createGoogleLoginHandler({ db, verify = verifyGoogleToken }) {
  return async function googleLoginHandler(req, res) {
    const { credential } = req.body ?? {};
    if (typeof credential !== 'string' || !credential) {
      res.status(400).json({ error: 'Request must include a "credential" (Google ID token).' });
      return;
    }

    let profile;
    try {
      profile = await verify(credential);
    } catch (err) {
      console.error('Google token verification failed:', err);
      res.status(401).json({ error: "Couldn't verify that Google sign-in, try again." });
      return;
    }

    const user = await findOrCreateUser(db, profile);
    const token = createSessionToken(user.id);
    setSessionCookie(res, token);
    res.json(toPublicUser(user));
  };
}

export function createMeHandler({ db }) {
  return async function meHandler(req, res) {
    const token = getSessionToken(req);
    const userId = token ? verifySessionToken(token) : null;
    if (!userId) {
      res.status(401).json({ error: 'Not signed in.' });
      return;
    }

    const user = await db('users').where({ id: userId }).first();
    if (!user) {
      res.status(401).json({ error: 'Not signed in.' });
      return;
    }

    res.json(toPublicUser(user));
  };
}

export function createLogoutHandler() {
  return function logoutHandler(req, res) {
    clearSessionCookie(res);
    res.status(204).end();
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd backend && node --test test/auth.route.test.js`
Expected: PASS (7 tests)

- [ ] **Step 5: Wire the routes into `backend/src/server.js`**

Replace the full file:

```js
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createChatHandler } from './routes/chat.js';
import { createRateLimiter } from './rateLimiter.js';
import { createGoogleLoginHandler, createMeHandler, createLogoutHandler } from './routes/auth.js';
import { db } from './db/index.js';

const app = express();
const PORT = process.env.PORT ?? 3001;

// Rate limiting below keys on req.ip, which assumes this server is not run behind
// a reverse proxy (Express's `trust proxy` is not enabled) - the client's real
// socket address is used directly, not a spoofable X-Forwarded-For header.
const allowedOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:5173';
app.use(cors({ origin: allowedOrigin, credentials: true }));
app.use(express.json());
app.use(cookieParser());

const chatRateLimiter = createRateLimiter({ windowMs: 60_000, max: 20 });
app.post('/api/chat', chatRateLimiter, createChatHandler({ providerName: process.env.AI_PROVIDER }));

app.post('/api/auth/google', createGoogleLoginHandler({ db }));
app.get('/api/auth/me', createMeHandler({ db }));
app.post('/api/auth/logout', createLogoutHandler());

await db.migrate.latest();

app.listen(PORT, () => {
  console.log(`Chatbot backend listening on http://localhost:${PORT}`);
});
```

- [ ] **Step 6: Start the backend and smoke-test the routes manually**

Run: `cd backend && npm run dev`
Expected console output: `Chatbot backend listening on http://localhost:3001` (and a new `backend/dev.sqlite3` file appears).

In a second terminal:
```bash
curl -i http://localhost:3001/api/auth/me
```
Expected: `401` with `{"error":"Not signed in."}` — confirms the route is wired and the cookie-less case works. (Testing the actual Google login end-to-end requires a real browser flow — covered in Task 9.)

Stop the dev server (Ctrl+C) before continuing.

- [ ] **Step 7: Commit**

```bash
git add backend/src/routes/auth.js backend/test/auth.route.test.js backend/src/server.js
git commit -m "feat(auth): add /api/auth/google, /me, /logout routes"
```

---

### Task 6: Frontend `AuthContext`

**Files:**
- Create: `frontend/src/auth/AuthContext.jsx`
- Create: `frontend/src/auth/AuthContext.test.jsx`

**Interfaces:**
- Produces: `AuthProvider` (component, wraps children), `useAuth()` hook returning `{ user: { id, email, name, pictureUrl } | null, loading: boolean, login: (credential: string) => Promise<void>, logout: () => Promise<void> }`.
- Talks to the backend at `import.meta.env.VITE_CHATBOT_API_URL ?? 'http://localhost:3001'` (same convention as `chatApi.js`), always with `credentials: 'include'` so the session cookie is sent/received.

- [ ] **Step 1: Write the failing test, `frontend/src/auth/AuthContext.test.jsx`**

```jsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent, cleanup } from '@testing-library/react';
import { AuthProvider, useAuth } from './AuthContext';

function Probe() {
  const { user, loading, login, logout } = useAuth();
  if (loading) return <div>loading</div>;
  return (
    <div>
      <div data-testid="user">{user ? user.name : 'anonymous'}</div>
      <button onClick={() => login('fake-credential')}>login</button>
      <button onClick={() => logout()}>logout</button>
    </div>
  );
}

describe('AuthContext', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('starts logged out when /api/auth/me returns 401', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({ ok: false, status: 401 });
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('anonymous'));
  });

  it('loads the user when /api/auth/me returns a profile', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: '1', email: 'a@b.com', name: 'Ada', pictureUrl: null }),
    });
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('Ada'));
  });

  it('every request includes credentials: "include" so the session cookie is sent', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 401 });
    globalThis.fetch = fetchMock;
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [, requestInit] = fetchMock.mock.calls[0];
    expect(requestInit.credentials).toBe('include');
  });

  it('login() POSTs the credential and updates user state on success', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 401 }) // initial /me on mount
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: '1', email: 'a@b.com', name: 'Ada', pictureUrl: null }),
      });
    globalThis.fetch = fetchMock;
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('anonymous'));

    fireEvent.click(screen.getByText('login'));
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('Ada'));

    const [, requestInit] = fetchMock.mock.calls[1];
    expect(JSON.parse(requestInit.body)).toEqual({ credential: 'fake-credential' });
  });

  it('login() throws when the backend rejects the credential', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, status: 401 }) // initial /me
      .mockResolvedValueOnce({ ok: false, json: () => Promise.resolve({ error: 'bad token' }) });
    globalThis.fetch = fetchMock;

    let thrown = null;
    function Catcher() {
      const { login } = useAuth();
      return <button onClick={() => login('bad').catch((e) => { thrown = e; })}>login</button>;
    }
    render(<AuthProvider><Catcher /></AuthProvider>);
    fireEvent.click(screen.getByText('login'));
    await waitFor(() => expect(thrown).not.toBeNull());
    expect(thrown.message).toBe('bad token');
  });

  it('logout() clears user state', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: '1', email: 'a@b.com', name: 'Ada', pictureUrl: null }),
      })
      .mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({}) });
    globalThis.fetch = fetchMock;
    render(<AuthProvider><Probe /></AuthProvider>);
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('Ada'));

    fireEvent.click(screen.getByText('logout'));
    await waitFor(() => expect(screen.getByTestId('user')).toHaveTextContent('anonymous'));
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npx vitest run src/auth/AuthContext.test.jsx`
Expected: FAIL — cannot find module `./AuthContext`

- [ ] **Step 3: Write `frontend/src/auth/AuthContext.jsx`**

```jsx
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_CHATBOT_API_URL ?? 'http://localhost:3001';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' });
      setUser(response.ok ? await response.json() : null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (credential) => {
    const response = await fetch(`${API_BASE}/api/auth/google`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential }),
    });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body.error ?? 'Sign-in failed.');
    }
    setUser(await response.json());
  }, []);

  const logout = useCallback(async () => {
    await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST', credentials: 'include' });
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && npx vitest run src/auth/AuthContext.test.jsx`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/auth/AuthContext.jsx frontend/src/auth/AuthContext.test.jsx
git commit -m "feat(auth): add AuthContext/useAuth for frontend session state"
```

---

### Task 7: Login page + `@react-oauth/google` install

**Files:**
- Create: `frontend/src/pages/Login.jsx`
- Create: `frontend/src/pages/Login.test.jsx`

**Interfaces:**
- Consumes: `useAuth()` (Task 6). Assumes it's rendered inside a `GoogleOAuthProvider` (wired in Task 9) and a router (for `useNavigate`).
- Produces: default export `Login` — a page component, no props.

- [ ] **Step 1: Install dependency**

Run: `cd frontend && npm install @react-oauth/google`

- [ ] **Step 2: Write the failing test, `frontend/src/pages/Login.test.jsx`**

```jsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from './Login';
import * as AuthContext from '../auth/AuthContext';

vi.mock('@react-oauth/google', () => ({
  GoogleLogin: ({ onSuccess, onError }) => (
    <div>
      <button onClick={() => onSuccess({ credential: 'fake-credential' })}>mock-google-success</button>
      <button onClick={() => onError()}>mock-google-error</button>
    </div>
  ),
}));

describe('Login', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('calls login() with the Google credential on success and navigates home', async () => {
    const login = vi.fn().mockResolvedValue(undefined);
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({ login });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('mock-google-success'));
    await waitFor(() => expect(login).toHaveBeenCalledWith('fake-credential'));
  });

  it('shows an inline error when login() rejects', async () => {
    const login = vi.fn().mockRejectedValue(new Error('bad token'));
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({ login });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('mock-google-success'));
    await waitFor(() => expect(screen.getByText(/couldn't verify/i)).toBeInTheDocument());
  });

  it('shows an inline error when Google itself reports an error', async () => {
    const login = vi.fn();
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({ login });

    render(
      <MemoryRouter>
        <Login />
      </MemoryRouter>
    );

    fireEvent.click(screen.getByText('mock-google-error'));
    await waitFor(() => expect(screen.getByText(/couldn't verify/i)).toBeInTheDocument());
    expect(login).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd frontend && npx vitest run src/pages/Login.test.jsx`
Expected: FAIL — cannot find module `./Login`

- [ ] **Step 4: Write `frontend/src/pages/Login.jsx`**

```jsx
import { useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState(null);

  async function handleSuccess(credentialResponse) {
    setError(null);
    try {
      await login(credentialResponse.credential);
      navigate('/');
    } catch {
      setError("Couldn't verify that sign-in, try again.");
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-background text-on-surface">
      <h1 className="text-2xl font-bold text-primary">Sign in to LovelaceLabs</h1>
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={() => setError("Couldn't verify that sign-in, try again.")}
      />
      {error && <p className="text-red-400 text-sm">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd frontend && npx vitest run src/pages/Login.test.jsx`
Expected: PASS (3 tests)

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/Login.jsx frontend/src/pages/Login.test.jsx frontend/package.json frontend/package-lock.json
git commit -m "feat(auth): add Login page with the real Google sign-in button"
```

---

### Task 8: `TopAppBar` account menu

**Files:**
- Modify: `frontend/src/components/layout/TopAppBar.jsx`
- Create: `frontend/src/components/layout/TopAppBar.test.jsx`

**Interfaces:**
- Consumes: `useAuth()` (Task 6). Assumes rendering inside a router (uses `Link`).
- No change to `TopAppBar`'s existing props (`{ sidebarOpen }`).

- [ ] **Step 1: Write the failing test, `frontend/src/components/layout/TopAppBar.test.jsx`**

```jsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TopAppBar from './TopAppBar';
import * as AuthContext from '../../auth/AuthContext';

describe('TopAppBar', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('shows a "Sign in" link when logged out', () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({ user: null, loading: false, logout: vi.fn() });
    render(<MemoryRouter><TopAppBar sidebarOpen={true} /></MemoryRouter>);
    expect(screen.getByText(/sign in/i)).toBeInTheDocument();
  });

  it('shows nothing account-related while loading', () => {
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({ user: null, loading: true, logout: vi.fn() });
    render(<MemoryRouter><TopAppBar sidebarOpen={true} /></MemoryRouter>);
    expect(screen.queryByText(/sign in/i)).not.toBeInTheDocument();
  });

  it('shows the user avatar/name and a working log out button when logged in', () => {
    const logout = vi.fn();
    vi.spyOn(AuthContext, 'useAuth').mockReturnValue({
      user: { id: '1', email: 'a@b.com', name: 'Ada', pictureUrl: null },
      loading: false,
      logout,
    });
    render(<MemoryRouter><TopAppBar sidebarOpen={true} /></MemoryRouter>);

    const avatarButton = screen.getByTitle('Ada');
    fireEvent.click(avatarButton);
    fireEvent.click(screen.getByText(/log out/i));
    expect(logout).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd frontend && npx vitest run src/components/layout/TopAppBar.test.jsx`
Expected: FAIL — `screen.getByText(/sign in/i)` not found (current `TopAppBar` has no such text)

- [ ] **Step 3: Rewrite `frontend/src/components/layout/TopAppBar.jsx`**

```jsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import accountIcon from '../../assets/icon-account.svg';
import { useAuth } from '../../auth/AuthContext';

export default function TopAppBar({ sidebarOpen }) {
  const sidebarWidth = sidebarOpen ? '208px' : '64px';
  const { user, loading, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header
      className="fixed top-0 right-0 h-[64px] z-40 bg-surface-container-low/40 border-b border-outline/20 backdrop-blur-xl flex justify-between items-center px-6 transition-all duration-300"
      style={{ width: `calc(100% - ${sidebarWidth})` }}
    >
      <div className="flex items-center gap-4">
        <div className="w-2 h-2 rounded-full bg-primary glow-accent" />
      </div>

      <div className="flex items-center gap-6">
        <button className="px-4 py-1.5 border border-primary bg-transparent text-primary text-[10px] tracking-[0.05em] font-bold font-mono rounded-sm hover:bg-primary/10 duration-200 cursor-pointer">
          UPGRADE TO PRO
        </button>

        {!loading && !user && (
          <Link
            to="/login"
            className="text-[11px] tracking-[0.05em] font-bold font-mono uppercase text-on-surface-variant hover:text-primary transition-colors"
          >
            Sign in
          </Link>
        )}

        {!loading && user && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              title={user.name}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-full border border-outline/20 overflow-hidden bg-surface-container flex items-center justify-center group-hover:border-primary transition-colors">
                <img
                  src={user.pictureUrl || accountIcon}
                  alt={user.name}
                  className="w-full h-full object-cover"
                />
              </div>
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-40 rounded-lg border border-outline/20 bg-surface-container-low shadow-lg py-1">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    logout();
                  }}
                  className="w-full text-left px-4 py-2 text-[11px] tracking-[0.05em] font-bold font-mono uppercase text-on-surface-variant hover:text-primary hover:bg-surface-container-high cursor-pointer"
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        )}

        {loading && (
          <div className="w-8 h-8 rounded-full border border-outline/20 overflow-hidden bg-surface-container flex items-center justify-center">
            <img src={accountIcon} alt="Account" className="w-5 h-5 object-contain opacity-70" />
          </div>
        )}
      </div>
    </header>
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `cd frontend && npx vitest run src/components/layout/TopAppBar.test.jsx`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/layout/TopAppBar.jsx frontend/src/components/layout/TopAppBar.test.jsx
git commit -m "feat(auth): wire TopAppBar's account icon to real sign-in/sign-out"
```

---

### Task 9: Wire `App.jsx`, env files, and manually verify the real Google flow

**Files:**
- Modify: `frontend/src/App.jsx`
- Modify: `frontend/.env.example`
- Modify: `frontend/.gitignore`
- Create: `frontend/.env`

**Interfaces:**
- Consumes: `AuthProvider` (Task 6), `Login` (Task 7), updated `TopAppBar` (Task 8).
- This task has no new unit tests of its own — `App.jsx`'s routing shell has no existing test precedent in this codebase (same as before this feature), so it's verified by the full existing test suite continuing to pass plus a manual end-to-end run against the real Google OAuth flow, which is the only way to actually exercise real Google sign-in.

- [ ] **Step 1: Close the `.env` gitignore gap**

Edit `frontend/.gitignore`, add a line in the existing block (after `*.local`):

```
node_modules
dist
dist-ssr
*.local
.env
```

- [ ] **Step 2: Add the placeholder to `frontend/.env.example`**

```
VITE_CHATBOT_API_URL=http://localhost:3001

# Google OAuth Client ID (public - safe to expose in frontend code).
# From the same Google Cloud Console credential used for backend/.env's
# GOOGLE_CLIENT_ID - it's the same value in both places.
VITE_GOOGLE_CLIENT_ID=
```

- [ ] **Step 3: Create `frontend/.env` with the real Client ID**

```
VITE_CHATBOT_API_URL=http://localhost:3001
VITE_GOOGLE_CLIENT_ID=406026603255-3uilq01jpv5hbvv996k1dga2n1sc7vv5.apps.googleusercontent.com
```

- [ ] **Step 4: Rewrite `frontend/src/App.jsx`**

```jsx
import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import './index.css';
import Sidebar from './components/layout/Sidebar';
import TopAppBar from './components/layout/TopAppBar';
import IntelligenceHub from './components/dashboard/IntelligenceHub';
import ChatbotWidget from './components/chatbot/ChatbotWidget';
import Login from './pages/Login';
import { AuthProvider } from './auth/AuthContext';
import { usePersistedState } from './components/chatbot/usePersistedState';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function Home({ sidebarOpen, onToggleSidebar, chatbotDismissed, onDismissChatbot, onRestoreChatbot }) {
  return (
    <div className="min-h-screen bg-background text-on-surface">
      <Sidebar open={sidebarOpen} onToggle={onToggleSidebar} onRestoreChatbot={onRestoreChatbot} />

      <main
        className="min-h-screen blueprint-grid transition-all duration-300"
        style={{ marginLeft: sidebarOpen ? '208px' : '64px' }}
      >
        <TopAppBar sidebarOpen={sidebarOpen} />

        <div className="flex flex-col items-center justify-center min-h-screen px-6 py-20">
          <IntelligenceHub />
        </div>
      </main>

      <ChatbotWidget dismissed={chatbotDismissed} onDismiss={onDismissChatbot} />
    </div>
  );
}

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatbotDismissed, setChatbotDismissed] = usePersistedState('chatbot:dismissed', false);

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="*"
              element={
                <Home
                  sidebarOpen={sidebarOpen}
                  onToggleSidebar={() => setSidebarOpen((v) => !v)}
                  chatbotDismissed={chatbotDismissed}
                  onDismissChatbot={() => setChatbotDismissed(true)}
                  onRestoreChatbot={() => setChatbotDismissed(false)}
                />
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}
```

- [ ] **Step 5: Run the full test suite**

Run: `cd backend && node --test`
Expected: all backend tests PASS (existing chatbot tests + all new auth tests from Tasks 1-5).

Run: `cd frontend && npx vitest run`
Expected: all frontend tests PASS (existing chatbot tests + all new auth tests from Tasks 6-8).

- [ ] **Step 6: Add `http://localhost:5173` as an authorized JavaScript origin in Google Cloud Console (if not already done)**

In [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials), open the OAuth client whose ID is in `frontend/.env`/`backend/.env`, and under "Authorized JavaScript origins" confirm `http://localhost:5173` is listed. Add it and save if it's missing — the Google button will fail with an origin-mismatch error in the browser console otherwise.

- [ ] **Step 7: Manually verify the real end-to-end flow**

Run both servers in separate terminals:
```bash
cd backend && npm run dev
cd frontend && npm run dev
```

In a browser at `http://localhost:5173`:
1. Confirm the calculator loads and works with no sign-in prompt (unchanged behavior).
2. Click "Sign in" in the top bar → lands on `/login`, real Google button renders.
3. Complete a real Google sign-in.
4. Confirm you're redirected to `/`, the top bar now shows your Google avatar instead of "Sign in".
5. Open browser dev tools → Application/Storage → Cookies → confirm a `session` cookie exists for `localhost:3001`, marked `HttpOnly`.
6. Reload the page → confirm you're still signed in (session persisted via the cookie, not lost on refresh).
7. Click your avatar → "Log out" → confirm the top bar reverts to "Sign in" and the cookie is cleared.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/App.jsx frontend/.env.example frontend/.gitignore
git commit -m "feat(auth): wire AuthProvider/GoogleOAuthProvider/router into App"
```

(`frontend/.env` is now gitignored and won't be staged — expected, it stays local.)

---

## Self-Review Notes

- **Spec coverage:** Google Cloud setup (documented in Task 9 steps + already done by the user), backend token verification + session cookie (Tasks 2-5), `users` table (Task 1), `AuthContext`/`Login`/`TopAppBar` (Tasks 6-8), `requireAuth` built-but-unwired (Task 4), CORS `credentials: true` (Task 5), calculator staying open with no gating (never touched by any task — verified in Task 9's manual check). All spec sections have a corresponding task.
- **Placeholder scan:** no TBD/TODO markers; every step has complete, runnable code.
- **Type consistency:** `toPublicUser()`'s `{ id, email, name, pictureUrl }` shape is used identically in `routes/auth.js` (Task 5), `AuthContext.jsx` (Task 6), `Login.jsx` (Task 7), and `TopAppBar.jsx` (Task 8) — checked for drift, none found.
