import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Protocolo RAW-SYNC: Desactivamos el almacenamiento del SDK por completo.
// Al usar 'undefined', el SDK no intentar acceder a Web Locks ni Storage.
// La persistencia la gestionaremos nosotros manualmente en AuthProvider.tsx.
export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false, // Desactivar la persistencia automtica por seguridad y locks
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // @ts-ignore
    lockRefreshSession: false,
  }
});
