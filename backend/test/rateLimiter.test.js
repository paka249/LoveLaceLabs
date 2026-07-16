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
