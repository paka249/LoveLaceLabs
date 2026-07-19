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
