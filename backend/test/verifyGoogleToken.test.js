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
