import { Pool, QueryResult, PoolClient, QueryResultRow, types } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Ensure PostgreSQL DATE (OID 1082) returns exact YYYY-MM-DD string without timezone skew
types.setTypeParser(1082, (val: string) => val);

const isVercel = Boolean(process.env.VERCEL);
const poolMax = process.env.DB_POOL_MAX 
  ? parseInt(process.env.DB_POOL_MAX, 10) 
  : (isVercel ? 1 : 3);

/**
 * Normalizes connection string for Supabase PostgreSQL.
 * If connecting to Supabase pooler on port 5432 (Session mode), rewrites to port 6543 (Transaction mode)
 * to prevent EMAXCONNSESSION (max clients reached in session mode - pool_size: 15) in serverless environments.
 */
export function getNormalizedConnectionString(rawUrl?: string): string | undefined {
  if (!rawUrl) return undefined;
  try {
    const url = new URL(rawUrl);
    // Supabase pooler hostnames typically contain 'pooler.supabase.com'
    if (url.hostname.includes('pooler.supabase.com') && (url.port === '5432' || !url.port)) {
      url.port = '6543';
      if (!url.searchParams.has('pgbouncer')) {
        url.searchParams.set('pgbouncer', 'true');
      }
      return url.toString();
    }
    return rawUrl;
  } catch {
    return rawUrl;
  }
}

export const pool = new Pool({
  connectionString: getNormalizedConnectionString(process.env.DATABASE_URL),
  ssl: (process.env.DATABASE_URL?.includes('supabase') || process.env.NODE_ENV === 'production') 
    ? { rejectUnauthorized: false } 
    : undefined,
  max: poolMax,
  idleTimeoutMillis: isVercel ? 1500 : 10000,
  connectionTimeoutMillis: 5000,
  allowExitOnIdle: true
});

pool.on('error', (err) => {
  console.error('[DATABASE] Unexpected error on idle PostgreSQL client:', err.message);
});

export async function query<T extends QueryResultRow = any>(text: string, params?: any[]): Promise<QueryResult<T>> {
  if (process.env.IS_TEST_RUN === 'true' && /^\s*(INSERT|UPDATE|DELETE|ALTER|DROP|CREATE)/i.test(text)) {
    return { rows: [], rowCount: 0, command: '', oid: 0, fields: [] } as QueryResult<T>;
  }
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

/**
 * Executes a callback with a checked-out client, guaranteeing client release upon completion or error.
 */
export async function withClient<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    return await fn(client);
  } finally {
    client.release();
  }
}

/**
 * Executes a callback within a managed database transaction, guaranteeing rollback on error and client release.
 */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try {
      await client.query('ROLLBACK');
    } catch (rbErr: any) {
      console.error('[DATABASE ROLLBACK ERROR]', rbErr.message);
    }
    throw err;
  } finally {
    client.release();
  }
}

export async function checkConnection(): Promise<{ 
  connected: boolean; 
  version?: string; 
  timestamp?: string; 
  error?: string;
  poolerMode?: 'transaction' | 'session' | 'direct';
  poolMax?: number;
}> {
  try {
    const res = await query('SELECT NOW() as current_time, version() as pg_version');
    const normalized = getNormalizedConnectionString(process.env.DATABASE_URL);
    let poolerMode: 'transaction' | 'session' | 'direct' = 'direct';
    if (normalized?.includes('pooler.supabase.com')) {
      poolerMode = normalized.includes(':6543') ? 'transaction' : 'session';
    }
    return {
      connected: true,
      timestamp: res.rows[0]?.current_time?.toISOString?.() || String(res.rows[0]?.current_time),
      version: res.rows[0]?.pg_version,
      poolerMode,
      poolMax
    };
  } catch (err: any) {
    return {
      connected: false,
      error: err.message
    };
  }
}
