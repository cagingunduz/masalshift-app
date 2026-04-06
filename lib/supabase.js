import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://mytqxxdzfrropqcrhipv.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15dHF4eGR6ZnJyb3BxY3JoaXB2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MjgwMTUsImV4cCI6MjA5MTAwNDAxNX0.eKAts80PGm6TTYSllnYq79UaG0_ERJi7FBLnh2GgG4I';

let _supabase;
try {
  _supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      autoRefreshToken: true,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });
} catch (e) {
  console.error('Supabase init error:', e);
}

export const supabase = _supabase;
