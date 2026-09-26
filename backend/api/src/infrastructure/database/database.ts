import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

import * as schema from './schema.js';

export type VitaNarrDatabase = NodePgDatabase<typeof schema>;

export interface DatabaseClient {
  database: VitaNarrDatabase;
  pool: Pool;
}

export function createDatabaseClient(connectionString: string): DatabaseClient {
  const pool = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  });

  return {
    database: drizzle(pool, { schema }),
    pool,
  };
}
