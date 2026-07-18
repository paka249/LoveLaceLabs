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
