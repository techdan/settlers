import * as dotenv from 'dotenv';
import path from 'path';
import { URL } from 'url';
import { sql } from 'drizzle-orm';

// Load .env.local BEFORE importing db
const envPath = path.resolve(process.cwd(), '.env.local');
console.log('Loading env from:', envPath);
dotenv.config({ path: envPath });

async function main() {
    console.log('Checking database connection...');

    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error('DATABASE_URL is not defined in environment');
        process.exit(1);
    }

    try {
        const parsed = new URL(dbUrl);
        console.log('Connection Info:');
        console.log('  Protocol:', parsed.protocol);
        console.log('  User:', parsed.username || '(none)');
        console.log('  Host:', parsed.hostname);
        console.log('  Port:', parsed.port);
        console.log('  Path:', parsed.pathname);
        console.log('  Password provided:', parsed.password ? 'Yes' : 'No');
    } catch (e) {
        console.error('Invalid URL format:', e);
    }

    try {
        // Dynamic import to ensure env vars are loaded first
        const { db } = await import('../lib/db');
        const result = await db.execute(sql`SELECT 1 as connected`);
        console.log('Database connection successful:', result);
    } catch (error) {
        console.error('Database connection failed:', error);
        process.exit(1);
    }
    process.exit(0);
}

main();
