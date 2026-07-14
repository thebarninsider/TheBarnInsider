import { createClient } from '@supabase/supabase-js';

// These are browser-safe Supabase project values. Row Level Security protects the data.
const url = import.meta.env.VITE_SUPABASE_URL || 'https://pvdmhfztxbposraxhqnd.supabase.co';
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_FoSimsOYORwIJ4ea5HwO-A_FXc-1BTG';

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
