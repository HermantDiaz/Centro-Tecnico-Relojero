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
  es_traslado: boolean;
  comision_pos: number;
  created_at: string;
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

    // Prevent orphaned sessions by forcing all currently open sessions to close
    await supabase
      .from('caja_sesiones')
      .update({
        estado: 'cerrada',
        notas: 'Cierre forzado automático por nueva apertura',
        fecha_cierre: new Date().toISOString()
      })
      .eq('estado', 'abierta');

    const { data, error } = await supabase
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
    setSession(data);
    return data;
  };

  const closeCaja = async (id: string, montoReal: number, notas?: string) => {
    if (!user) throw new Error('Usuario no autenticado');
    
    const diferencia = montoReal - (session?.monto_cierre_esperado || 0);
    
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
    await supabase.from('tesoreria_cuentas').update({ saldo: montoReal }).eq('nombre', 'Efectivo');

    setSession(null);
    return data;
  };

  const addMovimiento = async (mov: Omit<CajaMovimiento, 'id' | 'created_at' | 'sesion_id' | 'comision_pos'>) => {
    if (!session) throw new Error('No hay una caja abierta');

    // Lógica de comisión POS (4%)
    const comision_pos = mov.metodo_pago === 'POS' && mov.tipo === 'ingreso' ? (Number(mov.monto) * 0.04) : 0;

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

    // Actualizar el monto esperado de la sesión
    // Nota: El monto esperado en caja (drawer) solo se ve afectado por el 'Efectivo'. 
    // Sin embargo, para consistencia del reporte diario, sumamos todo.
    const impactoMonto = mov.tipo === 'ingreso' ? (Number(mov.monto) - comision_pos) : -Number(mov.monto);
    const nuevoEsperado = session.monto_cierre_esperado + impactoMonto;
    
    await supabase
      .from('caja_sesiones')
      .update({ monto_cierre_esperado: nuevoEsperado })
      .eq('id', session.id);

    setSession(prev => prev ? { ...prev, monto_cierre_esperado: nuevoEsperado } : null);
    return data;
  };

  return {
    session,
    loading,
    openCaja,
    closeCaja,
    addMovimiento,
    refresh: fetchSession
  };
};
