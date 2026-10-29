import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Protocolo TITAN-IMMUNE: Almacenamiento Atómico que ignora los Web Locks de Chrome.
// Esto evita el error 'Lock broken by another request with the steal option'.
const atomicStorage = {
  getItem: (key: string) => (typeof window !== 'undefined' ? window.sessionStorage.getItem(key) : null),
  setItem: (key: string, value: string) => { if (typeof window !== 'undefined') window.sessionStorage.setItem(key, value); },
  removeItem: (key: string) => { if (typeof window !== 'undefined') window.sessionStorage.removeItem(key); },
};

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    storage: atomicStorage,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // @ts-expect-error lockRefreshSession is an internal Supabase auth option
    lockRefreshSession: false,
  }
});
