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
