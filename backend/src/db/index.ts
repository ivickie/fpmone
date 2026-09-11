import { Pool, QueryResult, PoolClient, QueryResultRow } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;

export const pool = new Pool({
  connectionString,
  ssl: connectionString?.includes('supabase') || process.env.NODE_ENV === 'production' 
    ? { rejectUnauthorized: false } 
    : undefined,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

pool.on('error', (err) => {
  console.error('[DATABASE] Unexpected error on idle PostgreSQL client:', err.message);
});

export async function query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
  const start = Date.now();
  try {
    const res = await pool.query<T>(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development' && duration > 1000) {
      console.warn(`[DATABASE SLOW QUERY] ${duration}ms: ${text.substring(0, 100)}`);
    }
    return res;
  } catch (err: any) {
    console.error(`[DATABASE QUERY ERROR] ${err.message} | Query: ${text.substring(0, 150)}`);
    throw err;
  }
}

export async function getClient(): Promise<PoolClient> {
  return await pool.connect();
}

export async function checkConnection(): Promise<{ connected: boolean; version?: string; timestamp?: string; error?: string }> {
  try {
    const res = await query('SELECT NOW() as current_time, version() as pg_version');
    return {
      connected: true,
      timestamp: res.rows[0]?.current_time?.toISOString?.() || String(res.rows[0]?.current_time),
      version: res.rows[0]?.pg_version
    };
  } catch (err: any) {
    return {
      connected: false,
      error: err.message
    };
  }
}
