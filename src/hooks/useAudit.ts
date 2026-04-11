import { useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/components/AuthProvider';

export type ModuloAuditoria = 'Autenticación' | 'Reparaciones' | 'Finanzas' | 'Seguridad' | 'Inventario' | 'Deudas';
export type AccionAuditoria = 'LOGIN' | 'LOGOUT' | 'DELETE' | 'ANULACION' | 'CIERRE_CAJA' | 'REPORTE' | 'ALERTA' | 'CREADO' | 'PAGO DEUDA';

export const useAudit = () => {
    const { user } = useAuth();

    const logEvent = useCallback(async (
        accion: AccionAuditoria,
        modulo: ModuloAuditoria,
        detalles: string
    ) => {
        try {
            await supabase.from('auditoria_logs').insert([{
                usuario_id: user?.id || null,
                usuario_email: user?.email || 'Sistema/Anónimo',
                accion,
                modulo,
                detalles
            }]);
        } catch (error) {
            console.error('Error silencioso de auditoría:', error);
        }
    }, [user]);

    return { logEvent };
};
