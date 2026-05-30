import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
  const { data: cuentas } = await supabase.from('tesoreria_cuentas').select('*');
  const { data: sesiones } = await supabase.from('caja_sesiones').select('*').order('fecha_apertura', { ascending: false }).limit(1);
  console.log("Cuentas:");
  console.log(cuentas);
  console.log("Sesion actual:");
  console.log(sesiones);
}
check();
