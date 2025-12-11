import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Use Supabase database URL to ensure we connect to the same DB as Realtime
// Fallback to DATABASE_URL for local development
const connectionString = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL!;

// Singleton pattern to prevent multiple connections in development
const globalForDb = globalThis as unknown as {
    conn: postgres.Sql | undefined;
};

// Disable prefetch as it is not supported for "Transaction" pool mode
const client = globalForDb.conn ?? postgres(connectionString, { prepare: false });

if (process.env.NODE_ENV !== 'production') {
    globalForDb.conn = client;
}

export const db = drizzle(client, { schema });
