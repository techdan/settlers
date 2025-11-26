import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Use Supabase database URL to ensure we connect to the same DB as Realtime
// Fallback to DATABASE_URL for local development
const connectionString = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL!;

// Disable prefetch as it is not supported for "Transaction" pool mode
const client = postgres(connectionString, { prepare: false });
export const db = drizzle(client, { schema });
