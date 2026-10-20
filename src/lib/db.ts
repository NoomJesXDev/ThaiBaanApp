import { Pool, QueryResult, QueryResultRow } from 'pg';
import { executeDemoQuery } from './demo-db';

let pool: Pool | null = null;
let fallbackToDemoDb = false;

export function getPool(): Pool {
  if (!pool) {
    const isProduction = process.env.NODE_ENV === 'production' || process.env.PGSSL === 'true';
    
    if (process.env.DATABASE_URL) {
      pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: isProduction ? { rejectUnauthorized: false } : undefined,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2500,
      });
    } else {
      pool = new Pool({
        host: process.env.PGHOST || 'localhost',
        port: parseInt(process.env.PGPORT || '5432'),
        user: process.env.PGUSER || 'postgres',
        password: process.env.PGPASSWORD || 'localpassword',
        database: process.env.PGDATABASE || 'thaibann',
        ssl: isProduction ? { rejectUnauthorized: false } : undefined,
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 1200,
      });
    }
  }
  return pool;
}

export async function query<T extends QueryResultRow = any>(
  text: string,
  params?: any[]
): Promise<QueryResult<T>> {
  if (fallbackToDemoDb || process.env.USE_DEMO_DB === 'true') {
    return executeDemoQuery<T>(text, params);
  }

  try {
    const p = getPool();
    return await p.query<T>(text, params);
  } catch (err: any) {
    const msg = String(err?.message || '');
    const isConnOrTenantError =
      err?.code === 'ECONNREFUSED' ||
      err?.code === 'ENOTFOUND' ||
      err?.code === 'ETIMEDOUT' ||
      msg.includes('ECONNREFUSED') ||
      msg.includes('ENOTFOUND') ||
      msg.includes('tenant/user') ||
      msg.includes('Tenant or user not found') ||
      msg.includes('connect ETIMEDOUT') ||
      msg.includes('timeout expired') ||
      err?.errors?.some((e: any) => e?.code === 'ECONNREFUSED');

    if (isConnOrTenantError) {
      console.warn('⚠️ PostgreSQL unreachable or paused — switching automatically to Built-in Demo DB:', msg);
      fallbackToDemoDb = true;
      return executeDemoQuery<T>(text, params);
    }
    throw err;
  }
}
