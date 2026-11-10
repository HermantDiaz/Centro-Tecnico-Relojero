import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

// Cargar variables desde .env.local si existen
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
    if (match && !process.env[match[1]]) {
      process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '').trim();
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const hasRealSupabase =
  Boolean(supabaseUrl && supabaseAnonKey) &&
  !supabaseAnonKey.includes('placeholder');

const anonClient = hasRealSupabase
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  : null;

test(
  'Integration 1: Rol público anon tiene BLOQUEADO el acceso directo a tablas sensibles (clientes, reparaciones, inventario, auditoria_logs)',
  { skip: !hasRealSupabase },
  async () => {
    const tablasPrivadas = [
      'clientes',
      'reparaciones',
      'inventario',
      'auditoria_logs',
      'deudas_empresa',
      'tesoreria_cuentas',
    ];

    for (const tabla of tablasPrivadas) {
      const { data, error } = await anonClient.from(tabla).select('*').limit(5);
      // Debe devolver error de permiso denegado (42501) o 0 filas
      const bloqueado = Boolean(error) || !data || data.length === 0;
      assert.equal(
        bloqueado,
        true,
        `La tabla privada "${tabla}" no debería exponer filas al rol anon`
      );
    }
  }
);

test(
  'Integration 2: Rol público anon NO puede ejecutar funciones internas de RBAC (es_admin, get_user_rol)',
  { skip: !hasRealSupabase },
  async () => {
    const resAdmin = await anonClient.rpc('es_admin');
    assert.notEqual(resAdmin.error, null, 'es_admin() debe rechazar llamadas de anon');

    const resRol = await anonClient.rpc('get_user_rol');
    assert.notEqual(resRol.error, null, 'get_user_rol() debe rechazar llamadas de anon');
  }
);

test(
  'Integration 3: RPC consultar_reparacion_publica devuelve recibo exacto sin notas_internas ni telefono',
  { skip: !hasRealSupabase },
  async () => {
    const { data, error } = await anonClient.rpc('consultar_reparacion_publica', {
      p_numero_recibo: '1171',
    });
    assert.equal(error, null);
    assert.equal(Array.isArray(data), true);
    if (data.length > 0) {
      const orden = data[0];
      assert.equal(orden.numero_recibo, '1171');
      assert.equal('notas_internas' in orden, false);
      assert.equal('tecnico_asignado_id' in orden, false);
      assert.equal('telefono' in orden, false);
    }
  }
);

test(
  'Integration 4: RPC consultar_reparacion_publica rechaza comodines e inyecciones',
  { skip: !hasRealSupabase },
  async () => {
    const intentosInvalidos = ['%', '1%', '1 OR 1=1', '../1171', ''];
    for (const input of intentosInvalidos) {
      const { data } = await anonClient.rpc('consultar_reparacion_publica', {
        p_numero_recibo: input,
      });
      assert.equal(
        !data || data.length === 0,
        true,
        `El input inválido "${input}" no debe devolver ninguna reparación`
      );
    }
  }
);

test(
  'Integration 5: RPC listar_catalogo_publico expone solo artículos de venta sin precio_compra',
  { skip: !hasRealSupabase },
  async () => {
    const { data, error } = await anonClient.rpc('listar_catalogo_publico');
    assert.equal(error, null);
    assert.equal(Array.isArray(data), true);
    for (const item of data) {
      assert.equal(
        'precio_compra' in item,
        false,
        'listar_catalogo_publico jamás debe incluir precio_compra'
      );
      assert.equal(item.stock_actual > 0, true);
    }
  }
);

