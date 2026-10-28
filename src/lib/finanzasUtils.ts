export interface MovimientoFinancieroBase {
  id?: string;
  tipo: 'ingreso' | 'egreso';
  monto: number | string;
  concepto?: string;
  es_traslado?: boolean;
  created_at?: string;
  [key: string]: any;
}

/**
 * Filtra y neutraliza los movimientos anulados y sus contrapartidas de anulación ('ANULACIÓN: ...').
 * Garantiza que ni el movimiento original anulado ni la contrapartida de reversión inflen los reportes o dashboards.
 */
export function filtrarMovimientosValidos<T extends MovimientoFinancieroBase>(movimientos: T[]): T[] {
  if (!movimientos || movimientos.length === 0) return [];

  // Clonamos y ordenamos cronológicamente
  const movs = [...movimientos].sort(
    (a, b) => new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime()
  );

  const toRemove = new Set<string>();

  const anulaciones = movs.filter(m => m.concepto?.trim().startsWith('ANULACIÓN:'));

  anulaciones.forEach((anul, anulIndex) => {
    const anulKey = anul.id || `anul_${anulIndex}`;
    const originalConcepto = anul.concepto!.replace(/^ANULACIÓN:\s*/, '').trim();
    const originalTipo = anul.tipo === 'ingreso' ? 'egreso' : 'ingreso';
    const originalMonto = Number(anul.monto);

    const target = movs.find((m, targetIndex) => {
      const targetKey = m.id || `mov_${targetIndex}`;
      return (
        m.tipo === originalTipo &&
        Math.abs(Number(m.monto) - originalMonto) < 0.01 &&
        m.concepto?.trim() === originalConcepto &&
        new Date(m.created_at || 0) <= new Date(anul.created_at || 0) &&
        !toRemove.has(targetKey) &&
        targetKey !== anulKey
      );
    });

    if (target) {
      const targetKey = target.id || `mov_${movs.indexOf(target)}`;
      toRemove.add(targetKey);
      toRemove.add(anulKey);
    } else {
      // Si la anulación no encontró su contraparte en este lote (ej. original fuera de rango de fechas),
      // descartamos la anulación para que no compute como venta o egreso ordinario
      toRemove.add(anulKey);
    }
  });

  return movs.filter((m, index) => {
    const key = m.id || `mov_${index}`;
    return !toRemove.has(key);
  });
}
