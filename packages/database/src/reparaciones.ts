import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from './client';
import type { ReparacionData } from './types';

/**
 * Columnas públicas seguras para consultas de rastreo B2C y asistente RAG.
 * Excluye explícitamente `notas_internas`, `tecnico_asignado_id` y `clientes.telefono` por seguridad.
 */
const PUBLIC_REPARACION_COLUMNS = `
  id,
  numero_recibo,
  marca,
  tipo_reloj,
  modelo_descripcion,
  estado,
  problema_cliente,
  diagnostico_tecnico,
  precio_final,
  abono,
  saldo_pendiente,
  fecha_compromiso,
  fecha_ingreso,
  veces_garantia,
  clientes:cliente_id (nombre_completo)
`;

export function normalizarNumeroRecibo(raw: string): string {
  return raw.replace(/^[#\s]*(?:REP-|REC-)?/i, '').trim();
}

/**
 * Enmascara el nombre completo del cliente para vistas públicas B2C
 * Ejemplo: "Carlos Alberto Mendoza" -> "Carlos A. M."
 */
export function enmascararNombrePublico(nombre?: string | null): string {
  if (!nombre) return 'Cliente Registrado';
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return 'Cliente Registrado';
  if (partes.length === 1) return partes[0];
  const primerNombre = partes[0];
  const iniciales = partes
    .slice(1)
    .map((p) => `${p.charAt(0).toUpperCase()}.`)
    .join(' ');
  return `${primerNombre} ${iniciales}`;
}

const VALID_TICKET_REGEX = /^[A-Za-z0-9-]+$/;

export async function buscarReparacionPorRecibo(
  queryRaw: string,
  dbClient: SupabaseClient = supabase
): Promise<{ data: ReparacionData | null; error: Error | null }> {
  const raw = queryRaw.trim();
  if (!raw || raw.length > 24) return { data: null, error: null };

  const cleanNumber = normalizarNumeroRecibo(raw);
  if (!cleanNumber || !VALID_TICKET_REGEX.test(cleanNumber)) {
    return { data: null, error: null };
  }

  try {
    // 1. Intentar primero mediante RPC seguro (SECURITY DEFINER) si está disponible en BD
    const rpcRes = await dbClient.rpc('consultar_reparacion_publica', {
      p_numero_recibo: cleanNumber,
    });

    if (!rpcRes.error && rpcRes.data) {
      const row = Array.isArray(rpcRes.data) ? rpcRes.data[0] : rpcRes.data;
      if (row && row.numero_recibo) {
        return {
          data: {
            ...row,
            clientes: {
              nombre_completo: enmascararNombrePublico(
                row.cliente_nombre || row.clientes?.nombre_completo
              ),
            },
          } as ReparacionData,
          error: null,
        };
      }
    }

    // 2. Fallback: Coincidencia estrictamente exacta (sin comodines ILIKE '%...%')
    const candidatos = Array.from(
      new Set([
        raw,
        cleanNumber,
        `#${cleanNumber}`,
        `REP-${cleanNumber}`,
        `REC-${cleanNumber}`,
      ])
    );

    const { data, error } = await dbClient
      .from('reparaciones')
      .select(PUBLIC_REPARACION_COLUMNS)
      .in('numero_recibo', candidatos)
      .limit(1)
      .maybeSingle();

    if (!data) {
      return { data: null, error: error ? new Error(error.message) : null };
    }

    const clienteData = Array.isArray(data.clientes) ? data.clientes[0] : data.clientes;
    return {
      data: {
        ...data,
        clientes: clienteData
          ? {
              nombre_completo: enmascararNombrePublico(clienteData.nombre_completo),
            }
          : undefined,
      } as ReparacionData,
      error: null,
    };
  } catch (err) {
    return {
      data: null,
      error: err instanceof Error ? err : new Error('Error consultando reparación'),
    };
  }
}

