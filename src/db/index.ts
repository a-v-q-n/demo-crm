import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

function url(): string {
  const value = process.env.DATABASE_URL;
  if (!value) throw new Error('DATABASE_URL manquant');
  return value;
}

// Pool unique, conservé sur globalThis pour survivre au hot-reload de `next dev`.
const globalForDb = globalThis as unknown as { __pool?: Pool };
const pool = globalForDb.__pool ?? new Pool({ connectionString: url(), max: 8 });
if (process.env.NODE_ENV !== 'production') globalForDb.__pool = pool;

export const db = drizzle(pool, { schema });
export { schema };
