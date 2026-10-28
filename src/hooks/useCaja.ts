import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';

export interface CajaSesion {
  id: string;
  abierta_por: string;
  cerrada_por?: string;
  fecha_apertura: string;
  fecha_cierre?: string;
  monto_apertura: number;
  monto_cierre_esperado: number;
  monto_cierre_real?: number;
  diferencia: number;
  estado: 'abierta' | 'cerrada';
  notas?: string;
}

export interface MovimientoDetalle {
  producto_id?: string | null;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface CajaMovimiento {
  id: string;
  sesion_id: string;
  tipo: 'ingreso' | 'egreso';
  monto: number;
  utilidad_neta: number;
  concepto: string;
  categoria: string;
  metodo_pago: 'Efectivo' | 'BAC' | 'LAFISE' | 'BANPRO' | 'POS';
  referencia_id?: string;
  referencia_bancaria?: string;
  perfil_id?: string;
  subcategoria_id?: string;
  cliente_id?: string;
  descuento?: number;
  subtotal?: number;
  es_traslado: boolean;
  comision_pos: number;
  created_at: string;
  caja_movimientos_detalles?: MovimientoDetalle[];
}

export const useCaja = () => {
  const { user } = useAuth();
  const [session, setSession] = useState<CajaSesion | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSession = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('caja_sesiones')
        .select('*')
        .eq('estado', 'abierta')
        .order('fecha_apertura', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      setSession(data);
    } catch (error) {
      console.error('Error fetching caja session:', error);
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchSession();
    } else {
      setSession(null);
      setLoading(false);
    }
  }, [user, fetchSession]);

  const openCaja = async (monto: number, notas?: string) => {
    if (!user) throw new Error('Usuario no autenticado');

    // 1. Obtener saldo global previo para detectar fugas fuera de turno
    const { data: cuentaEfectivo } = await supabase
      .from('tesoreria_cuentas')
      .select('saldo')
      .eq('nombre', 'Efectivo')
      .single();
    
    const saldoAnterior = Number(cuentaEfectivo?.saldo || 0);
    const diferenciaApertura = monto - saldoAnterior;

    // 2. Cerrar sesiones huérfanas forzosamente
    await supabase
      .from('caja_sesiones')
      .update({
        estado: 'cerrada',
        notas: 'Cierre forzado automático por nueva apertura',
        fecha_cierre: new Date().toISOString()
      })
      .eq('estado', 'abierta');

    // 3. Crear nueva sesión
    const { data: nuevaSesion, error } = await supabase
      .from('caja_sesiones')
      .insert([{
        abierta_por: user.id,
        monto_apertura: monto,
        monto_cierre_esperado: monto,
        estado: 'abierta',
        notas
      }])
      .select()
      .single();

    if (error) throw error;

    // 4. Generar movimiento automático si hubo fuga o sobrante fuera de turno
    if (diferenciaApertura !== 0) {
      await supabase.from('caja_movimientos').insert([{
        sesion_id: nuevaSesion.id,
        tipo: diferenciaApertura > 0 ? 'ingreso' : 'egreso',
        monto: Math.abs(diferenciaApertura),
        utilidad_neta: 0,
        concepto: diferenciaApertura > 0 ? 'Ajuste: Sobrante detectado al abrir caja (Ingreso no registrado)' : 'Ajuste: Faltante detectado al abrir caja (Fuga fuera de turno)',
        categoria: 'Ajuste de Caja',
        metodo_pago: 'Efectivo',
        es_traslado: false,
        comision_pos: 0,
        perfil_id: user.id
      }]);
      // Sincronizar tesorería con la realidad declarada al abrir
      const { error: tesoreriaError } = await supabase.from('tesoreria_cuentas').update({ saldo: monto }).eq('nombre', 'Efectivo');
      if (tesoreriaError) {
        console.error("Error actualizando tesorería en apertura:", tesoreriaError);
        throw new Error("No se pudo actualizar la bóveda. Posible restricción de permisos (RLS).");
      }
    }

    setSession(nuevaSesion);
    return nuevaSesion;
  };

  const closeCaja = async (id: string, montoReal: number, notas?: string) => {
    if (!user) throw new Error('Usuario no autenticado');
    
    const diferencia = montoReal - (session?.monto_cierre_esperado || 0);
    
    // Generar ajuste automático en el ledger si hubo descuadre durante el turno
    if (diferencia !== 0) {
      await supabase.from('caja_movimientos').insert([{
        sesion_id: id,
        tipo: diferencia > 0 ? 'ingreso' : 'egreso',
        monto: Math.abs(diferencia),
        utilidad_neta: 0,
        concepto: diferencia > 0 ? 'Ajuste: Sobrante no justificado en cierre de turno' : 'Ajuste: Faltante reportado en cierre de turno',
        categoria: 'Ajuste de Caja',
        metodo_pago: 'Efectivo',
        es_traslado: false,
        comision_pos: 0,
        perfil_id: user.id
      }]);
    }

    const { data, error } = await supabase
      .from('caja_sesiones')
      .update({
        cerrada_por: user.id,
        fecha_cierre: new Date().toISOString(),
        monto_cierre_real: montoReal,
        diferencia,
        estado: 'cerrada',
        notas: (session?.notas || '') + (notas ? ` | Cierre: ${notas}` : '')
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    // Forzar la sincronización de la bóveda de Efectivo con el arqueo físico real
    const { error: tesoreriaError } = await supabase.from('tesoreria_cuentas').update({ saldo: montoReal }).eq('nombre', 'Efectivo');
    
    if (tesoreriaError) {
      console.error("Error actualizando tesorería en cierre:", tesoreriaError);
      // No bloqueamos el cierre si falla la tesorería, pero dejamos log.
      // throw new Error("Caja cerrada, pero hubo un error actualizando la bóveda: " + tesoreriaError.message);
    }

    setSession(null);
    return data;
  };

  const addMovimiento = async (mov: Omit<CajaMovimiento, 'id' | 'created_at' | 'sesion_id' | 'comision_pos'>, detalles?: MovimientoDetalle[]) => {
    if (!session) throw new Error('No hay una caja abierta');

    const montoNum = Number(mov.monto);
    if (isNaN(montoNum) || montoNum <= 0) {
      throw new Error('El monto del movimiento debe ser mayor a 0');
    }

    // VALIDACIÓN ESTRICTA DE SALDOS (EFECTIVO Y BANCOS):
    // Impide que cualquier egreso genere saldos negativos en efectivo físico o cuentas bancarias.
    if (mov.tipo === 'egreso') {
      // 1. Si es Efectivo: validar que la gaveta de la sesión abierta tenga fondos suficientes
      if (mov.metodo_pago === 'Efectivo') {
        const { data: sesionActual } = await supabase
          .from('caja_sesiones')
          .select('monto_cierre_esperado')
          .eq('id', session.id)
          .single();

        const disponibleEfectivo = sesionActual ? Number(sesionActual.monto_cierre_esperado) : Number(session.monto_cierre_esperado);
        if (montoNum > disponibleEfectivo) {
          throw new Error(`Fondos insuficientes en Efectivo: Intentas egresar $${montoNum.toFixed(2)}, pero solo hay $${disponibleEfectivo.toFixed(2)} disponibles en la gaveta física.`);
        }
      }

      // 2. Si es Banco (BAC, LAFISE, BANPRO) o cuenta en tesorería: validar saldo disponible en cuenta
      const { data: cuentaTesoreria } = await supabase
        .from('tesoreria_cuentas')
        .select('saldo, nombre')
        .eq('nombre', mov.metodo_pago)
        .maybeSingle();

      if (cuentaTesoreria) {
        const saldoDisponible = Number(cuentaTesoreria.saldo);
        if (montoNum > saldoDisponible) {
          throw new Error(`Fondos insuficientes en ${cuentaTesoreria.nombre}: Intentas egresar $${montoNum.toFixed(2)}, pero el saldo disponible en cuenta es de $${saldoDisponible.toFixed(2)}.`);
        }
      }
    }

    // Lógica de comisión POS (4%)
    const comision_pos = mov.metodo_pago === 'POS' && mov.tipo === 'ingreso' ? (montoNum * 0.04) : 0;

    const { data, error } = await supabase
      .from('caja_movimientos')
      .insert([{
        ...mov,
        comision_pos,
        sesion_id: session.id
      }])
      .select()
      .single();

    if (error) throw error;

    // Si hay detalles del carrito, los insertamos
    if (detalles && detalles.length > 0) {
      const dbDetalles = detalles.map(d => ({
        movimiento_id: data.id,
        producto_id: d.producto_id,
        descripcion: d.descripcion,
        cantidad: d.cantidad,
        precio_unitario: d.precio_unitario,
        subtotal: d.subtotal
      }));
      const { error: errorDetalles } = await supabase.from('caja_movimientos_detalles').insert(dbDetalles);
      if (errorDetalles) {
        console.error("Error insertando detalles:", errorDetalles);
        throw new Error("No se pudieron guardar los detalles del carrito: " + errorDetalles.message);
      }
    }

    // Actualizar el monto esperado de la sesión
    // Nota: El monto esperado en caja (drawer) SOLO debe verse afectado por el 'Efectivo'.
    // Los pagos por banco/POS no entran físicamente a la gaveta.
    if (mov.metodo_pago === 'Efectivo') {
        const impactoMonto = mov.tipo === 'ingreso' ? (Number(mov.monto) - comision_pos) : -Number(mov.monto);
        
        // Consultar el valor actual directo de la sesión en BD para evitar desfases de memoria
        const { data: sesionActual } = await supabase
          .from('caja_sesiones')
          .select('monto_cierre_esperado')
          .eq('id', session.id)
          .single();

        const baseEsperado = sesionActual ? Number(sesionActual.monto_cierre_esperado) : Number(session.monto_cierre_esperado);
        const nuevoEsperado = baseEsperado + impactoMonto;
        
        await supabase
          .from('caja_sesiones')
          .update({ monto_cierre_esperado: nuevoEsperado })
          .eq('id', session.id);

        setSession(prev => prev ? { ...prev, monto_cierre_esperado: nuevoEsperado } : null);
    }
    return data;
  };

  const justifyShortage = async (sesionId: string, expenses: Array<{monto: number, concepto: string, categoria: string, subcategoria_id?: string}>) => {
    if (!user) throw new Error('Usuario no autenticado');

    // 1. Obtener la sesión
    const { data: sesion, error: sesError } = await supabase
      .from('caja_sesiones')
      .select('*')
      .eq('id', sesionId)
      .single();
    
    if (sesError || !sesion) throw new Error('No se encontró la sesión');
    if (sesion.estado !== 'cerrada') throw new Error('Solo se pueden justificar faltantes de sesiones cerradas');

    // 2. Buscar el movimiento de ajuste automático (Faltante)
    const { data: ajusteMov } = await supabase
      .from('caja_movimientos')
      .select('id, monto')
      .eq('sesion_id', sesionId)
      .eq('concepto', 'Ajuste: Faltante reportado en cierre de turno')
      .eq('tipo', 'egreso')
      .maybeSingle();

    // 3. Insertar nuevos gastos
    const totalNuevosGastos = expenses.reduce((acc, e) => acc + Number(e.monto), 0);
    
    const dbExpenses = expenses.map(e => ({
      sesion_id: sesionId,
      tipo: 'egreso' as const,
      monto: Number(e.monto),
      utilidad_neta: 0,
      concepto: e.concepto,
      categoria: e.categoria,
      subcategoria_id: e.subcategoria_id,
      metodo_pago: 'Efectivo' as const,
      es_traslado: false,
      comision_pos: 0,
      perfil_id: user.id,
      created_at: sesion.fecha_cierre
    }));

    const { error: insError } = await supabase.from('caja_movimientos').insert(dbExpenses);
    if (insError) throw insError;

    // 4. Eliminar el ajuste original si existía
    if (ajusteMov) {
      await supabase.from('caja_movimientos').delete().eq('id', ajusteMov.id);
    }

    // 5. Recalcular balance de la sesión
    const nuevoMontoEsperado = Number(sesion.monto_cierre_esperado) - totalNuevosGastos;
    const nuevaDiferencia = Number(sesion.monto_cierre_real) - nuevoMontoEsperado;

    const { error: updError } = await supabase
      .from('caja_sesiones')
      .update({
        monto_cierre_esperado: nuevoMontoEsperado,
        diferencia: nuevaDiferencia,
        notas: (sesion.notas || '') + ` | JUSTIFICACIÓN FALTANTE: Se registraron ${expenses.length} gastos reales.`
      })
      .eq('id', sesionId);

    if (updError) throw updError;

    return { success: true };
  };

  return {
    session,
    loading,
    openCaja,
    closeCaja,
    addMovimiento,
    justifyShortage,
    refresh: fetchSession
  };
};
