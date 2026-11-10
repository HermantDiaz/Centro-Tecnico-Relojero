import { buscarReparacionPorRecibo, supabaseServer } from '@relojeria/database';

export interface ChatTurn {
  role: 'user' | 'assistant' | string;
  content: string;
}

/**
 * Extrae el número de recibo o ticket mencionado en los últimos 5 mensajes del usuario.
 */
export function extractTicketFromHistory(messages: ChatTurn[]): string | null {
  const reversedUserMessages = [...messages].reverse().filter((m) => m.role === 'user');
  for (const msg of reversedUserMessages.slice(0, 5)) {
    const text = String(msg?.content || '');
    const match =
      text.match(/(?:recibo|ticket|orden|boleta|#)\s*([0-9]{2,8})/i) ||
      text.match(/\b([0-9]{3,6})\b/);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return null;
}

/**
 * Ejecuta la consulta RAG/Tool Calling en tiempo real contra Supabase y formatea
 * el bloque de contexto inmutable para el modelo.
 */
export async function buildRepairRagContext(ticketId: string): Promise<string> {
  try {
    const { data: orden, error: dbError } = await buscarReparacionPorRecibo(
      ticketId,
      supabaseServer
    );

    if (dbError) {
      console.error('Error al consultar Supabase en ai-engine:', dbError);
    }

    if (orden) {
      const clienteNombre = orden.clientes?.nombre_completo || 'Cliente Registrado';
      const fallaTexto =
        orden.problema_cliente ||
        orden.diagnostico_tecnico ||
        orden.falla_declarada ||
        'Revisión técnica';
      const presupuestoTotal = Number(orden.precio_final ?? orden.costo_estimado ?? 0);
      const abonoRealizado = Number(orden.abono ?? 0);
      const saldoPendiente = Number(
        orden.saldo_pendiente ?? orden.saldo ?? Math.max(0, presupuestoTotal - abonoRealizado)
      );
      const fechaRaw = orden.fecha_compromiso || orden.fecha_promesa;
      const fechaTexto = fechaRaw
        ? new Date(fechaRaw).toLocaleDateString('es-NI', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })
        : 'A definir';

      const estadoLower = String(orden.estado || '').toLowerCase();
      let estadoExplicito = orden.estado;
      if (estadoLower.includes('repara') && !estadoLower.includes('no repara')) {
        estadoExplicito =
          'EN REPARACIÓN (AÚN NO ESTÁ LISTO PARA RETIRO — sigue en mesa de trabajo del taller)';
      } else if (estadoLower.includes('diagnostico') || estadoLower.includes('diagnóstico')) {
        estadoExplicito = 'EN DIAGNÓSTICO TÉCNICO (AÚN NO ESTÁ LISTO PARA RETIRO)';
      } else if (estadoLower.includes('listo')) {
        estadoExplicito = 'LISTO PARA RETIRO (Ya puede pasar a recogerlo al taller)';
      } else if (estadoLower.includes('entregado')) {
        estadoExplicito = 'ENTREGADO AL CLIENTE';
      } else if (estadoLower.includes('garantia') || estadoLower.includes('garantía')) {
        estadoExplicito = 'EN REVISIÓN POR GARANTÍA (AÚN NO ESTÁ LISTO PARA RETIRO)';
      }

      return `
[CONSULTA EN TIEMPO REAL A BASE DE DATOS DE REPARACIONES - DATOS OFICIALES]
- Número de Recibo: #${orden.numero_recibo}
- Cliente: ${clienteNombre}
- Marca de Reloj: ${orden.marca} (${orden.tipo_reloj || 'Reloj'})
- Modelo: ${orden.modelo_descripcion || 'No especificado'}
- ESTADO ACTUAL EN BASE DE DATOS: ${estadoExplicito}
- Trabajo / Diagnóstico: ${fallaTexto}
- Presupuesto Total: $${presupuestoTotal.toFixed(2)}
- Abono Realizado: $${abonoRealizado.toFixed(2)}
- Saldo Pendiente Exacto: $${saldoPendiente.toFixed(2)}
- Fecha Estimada de Entrega: ${fechaTexto}
(INSTRUCCIÓN ESTRICTA: Usa ÚNICAMENTE estos datos reales. Si el estado dice "EN REPARACIÓN" o "AÚN NO ESTÁ LISTO", informa claramente que todavía está en proceso en el taller y NO digas que ya está listo. Indica el modelo, trabajo realizado, saldo pendiente exacto y fecha estimada).
`;
    }

    return `
[CONSULTA EN TIEMPO REAL A BASE DE DATOS DE REPARACIONES]
- Búsqueda realizada para el recibo: #${ticketId}
- Resultado: No se encontró orden registrada con ese número en la base de datos.
(Instrucción: Informa brevemente que no aparece ese recibo y sugiérele verificar el número en su boleta o escribirnos por WhatsApp).
`;
  } catch (err) {
    console.error('Fallo de conexión con Supabase en ai-engine:', err);
    return '';
  }
}

