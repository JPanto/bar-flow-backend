import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.js';
import { env } from '../../config/env.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  ssl: env.NODE_ENV === 'production' || env.DATABASE_URL.includes('neon.tech')
    ? { rejectUnauthorized: false }
    : undefined,
});

export const db = drizzle(pool, { schema });

export type DatabaseInstance = typeof db;
