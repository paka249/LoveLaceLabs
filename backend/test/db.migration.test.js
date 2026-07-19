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
