import { createClient, SupabaseClient } from '@supabase/supabase-js';

let cachedClient: SupabaseClient | null = null;
let initAttempted = false;

/**
 * Lazily create the Supabase client. Returns null when env vars are missing so
 * callers can gracefully fall back (e.g., to polling).
 */
export function getSupabaseClient(): SupabaseClient | null {
    if (cachedClient || initAttempted) {
        return cachedClient;
    }

    initAttempted = true;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        if (process.env.NODE_ENV !== 'production') {
            console.warn('[supabase] Realtime disabled: missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY');
        }
        return null;
    }

    cachedClient = createClient(supabaseUrl, supabaseAnonKey);
    return cachedClient;
}

export const supabase = getSupabaseClient();
