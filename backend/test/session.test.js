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
