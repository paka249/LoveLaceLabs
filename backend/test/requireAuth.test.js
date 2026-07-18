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
