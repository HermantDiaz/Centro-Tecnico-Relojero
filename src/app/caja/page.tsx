"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import { useCaja, CajaMovimiento } from "@/hooks/useCaja";
import { supabase } from "@/lib/supabase";
import { 
  Wallet, 
  ArrowUpRight, 
  ArrowDownLeft, 
  History, 
  Users, 
  Plus, 
  TrendingUp,
  Building2,
  ArrowRightLeft,
  AlertCircle,
  CheckCircle2,
  Search,
  X,
  ExternalLink,
  Ban,
  Printer,
  FileText
} from "lucide-react";
import { useRouter } from "next/navigation";
import ComprobantePago from "@/components/caja/ComprobantePago";
import { useAudit } from "@/hooks/useAudit";
import { useSettings } from "@/hooks/useSettings";

const METODOS_PAGO = ["Efectivo", "BAC", "LAFISE", "BANPRO", "POS"] as const;
const CATEGORIAS_GASTO = ["Compras e Inventario", "Operaciones Fijas", "Planilla y Comisiones", "Marketing y Publicidad", "Servicios Básicos", "Impuestos y Finanzas", "Otros"];
const TIPOS_DEUDA = ["Proveedor", "Impuesto", "Prestamo", "Otro"] as const;


interface CuentaTesoreria {
    id: string;
    nombre: string;
    tipo: string;
    saldo: number;
}

interface DeudaEmpresa {
    id: string;
    acreedor: string;
    monto_total: number;
    saldo_pendiente: number;
    tipo: typeof TIPOS_DEUDA[number];
    fecha_vencimiento: string;
    estado: 'Pendiente' | 'Parcial' | 'Pagado';
    notas: string;
}

export default function FinanzasPage() {
  const { rol, user, loading: authLoading } = useAuth();
  const { session, loading: cajaLoading, openCaja, closeCaja, addMovimiento, refresh: refreshCaja } = useCaja();
  const { formatCurrency, empresa } = useSettings();
  const router = useRouter();
  const { logEvent } = useAudit();
  
  const [activeTab, setActiveTab] = useState<'hoy' | 'movimientos' | 'tesoreria' | 'facturas'>('hoy');
  const [movimientos, setMovimientos] = useState<CajaMovimiento[]>([]);
  const [facturas, setFacturas] = useState<CajaMovimiento[]>([]);
  const [cuentas, setCuentas] = useState<CuentaTesoreria[]>([]);
  const [deudas, setDeudas] = useState<DeudaEmpresa[]>([]);
  const [saldosCobrar, setSaldosCobrar] = useState(0);

  // Comprobante State
  const [showComprobante, setShowComprobante] = useState(false);
  const [comprobanteData, setComprobanteData] = useState<any>(null);

  // Modales
  const [isAperturaModalOpen, setIsAperturaModalOpen] = useState(false);
  const [isIngresoModalOpen, setIsIngresoModalOpen] = useState(false);
  const [isGastoModalOpen, setIsGastoModalOpen] = useState(false);
  const [isCierreModalOpen, setIsCierreModalOpen] = useState(false);
  const [isTrasladoModalOpen, setIsTrasladoModalOpen] = useState(false);
  const [montoApertura, setMontoApertura] = useState("");
  const [montoUltimoCierre, setMontoUltimoCierre] = useState<number | null>(null);
  const [justificacionApertura, setJustificacionApertura] = useState("");
  const [montoCierreReal, setMontoCierreReal] = useState("");
  const [notasCierre, setNotasCierre] = useState("");
  
  const [nuevoIngreso, setNuevoIngreso] = useState({ monto: "", concepto: "", categoria: "Ventas", metodo_pago: "Efectivo" as any });
  const [nuevoGasto, setNuevoGasto] = useState({ monto: "", concepto: "", categoria: "Otros", subcategoria_id: "", metodo_pago: "Efectivo" as any, referencia_bancaria: "" });
  const [nuevoTraslado, setNuevoTraslado] = useState({ monto: "", desde: "Efectivo", hacia: "BAC", referencia: "" });
  const [subcategorias, setSubcategorias] = useState<{id: string, nombre: string, categoria_padre: string}[]>([]);

  const fetchData = useCallback(async () => {
    // 1. Movimientos
    if (session?.id) {
        const { data: movs } = await supabase
          .from('caja_movimientos')
          .select('*')
          .eq('sesion_id', session.id)
          .order('created_at', { ascending: false });
        if (movs) setMovimientos(movs);
    }

    // 2. Cuentas Tesorería
    const { data: cts } = await supabase.from('tesoreria_cuentas').select('*').order('nombre');
    if (cts) setCuentas(cts);

    // 3. Subcategorias
    const { data: subcats } = await supabase.from('caja_subcategorias').select('id, nombre, categoria_padre').order('nombre');
    if (subcats) setSubcategorias(subcats);

    // 3. Deudas
    const { data: dds } = await supabase.from('deudas_empresa').select('*').order('fecha_vencimiento');
    if (dds) setDeudas(dds);

    // 4. Saldos por Cobrar
    const { data: reps } = await supabase.from('reparaciones').select('saldo_pendiente').gt('saldo_pendiente', 0);
    if (reps) {
        const total = reps.reduce((acc, r) => acc + Number(r.saldo_pendiente), 0);
        setSaldosCobrar(total);
    }
  }, [session?.id]);

  useEffect(() => {
    if (user) fetchData();
  }, [user, fetchData]);

  // Lazy Load of Historial de Facturas
  useEffect(() => {
        if (activeTab === 'facturas' && facturas.length === 0) {
            const fetchFacturas = async () => {
                const { data, error } = await supabase
                    .from('caja_movimientos')
                    .select('*')
                    .eq('tipo', 'ingreso')
                    .order('created_at', { ascending: false })
                    .limit(300); // Mostramos los últimos 300 cobros
                if (!error && data) setFacturas(data as CajaMovimiento[]);
            };
            fetchFacturas();
        }
  }, [activeTab]);

  const stats = useMemo(() => {
    const ingresos = movimientos.filter(m => m.tipo === 'ingreso' && !m.es_traslado).reduce((acc, m) => acc + (Number(m.monto) - Number(m.comision_pos || 0)), 0);
    const egresos = movimientos.filter(m => m.tipo === 'egreso' && !m.es_traslado).reduce((acc, m) => acc + Number(m.monto), 0);
    const utilidad = movimientos.filter(m => !m.es_traslado).reduce((acc, m) => acc + Number(m.utilidad_neta || 0), 0);
    
    // Capital real (Saldos en banco + Efectivo físico)
    const capitalDisponible = cuentas.reduce((acc, c) => acc + Number(c.saldo), 0);
    const deudasTotales = deudas.filter(d => d.estado !== 'Pagado').reduce((acc, d) => acc + Number(d.saldo_pendiente), 0);

    return { 
        ingresos, 
        egresos, 
        utilidad, 
        capitalDisponible, 
        deudasTotales, 
        liquidezTotal: capitalDisponible + saldosCobrar - deudasTotales 
    };
  }, [movimientos, cuentas, deudas, saldosCobrar]);

  useEffect(() => {
    // Si no hay sesión abierta, intentar precargar el monto de apertura con el último cierre real
    if (!session && !cajaLoading) {
      const fetchLastCierre = async () => {
        const { data } = await supabase
          .from('caja_sesiones')
          .select('monto_cierre_real')
          .order('fecha_cierre', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (data && data.monto_cierre_real !== null) {
          setMontoApertura(data.monto_cierre_real.toString());
          setMontoUltimoCierre(data.monto_cierre_real);
        }
      };
      fetchLastCierre();
    }
  }, [session, cajaLoading]);

  if (authLoading || cajaLoading) return (
    <div className="flex h-[80vh] items-center justify-center">
        <div className="w-12 h-12 border-4 border-neutral-200 border-t-black dark:border-t-white rounded-full animate-spin"></div>
    </div>
  );

  if (rol !== 'admin') return <div className="p-10 text-center">Acceso denegado.</div>;

  const handleOpenCaja = async () => {
    if (!montoApertura) return;
    const hayDescuadre = montoUltimoCierre !== null && Number(montoApertura) !== montoUltimoCierre;
    if (hayDescuadre && !justificacionApertura.trim()) {
       alert("Debes escribir una justificación para el descuadre de apertura.");
       return;
    }
    try {
      const notasApertura = hayDescuadre ? `Apertura con Descuadre (Real ${montoApertura} vs Esperado ${montoUltimoCierre}). Justificación: ${justificacionApertura}` : '';
      await openCaja(Number(montoApertura), notasApertura);
      setIsAperturaModalOpen(false);
      setJustificacionApertura("");
      logEvent('sistema', `Caja abierta con ${montoApertura}`);
    } catch (error: any) {
      alert("Error abriendo caja: " + error.message);
    }
  };

  const handleAddIngreso = async () => {
    try {
      const data = await addMovimiento({
        tipo: 'ingreso',
        monto: Number(nuevoIngreso.monto),
        utilidad_neta: Number(nuevoIngreso.monto) * 0.45,
        concepto: nuevoIngreso.concepto,
        categoria: nuevoIngreso.categoria,
        metodo_pago: nuevoIngreso.metodo_pago,
        es_traslado: false
      });
      // Set Receipt Info
      setComprobanteData({
          numero_recibo: data?.id ? data.id.split('-')[0].toUpperCase() : Math.floor(Math.random() * 90000) + 10000 + "",
          cliente_nombre: "PÚBLICO EN GENERAL",
          monto: Number(nuevoIngreso.monto),
          metodo_pago: nuevoIngreso.metodo_pago,
          concepto: `Ingreso Manual: ${nuevoIngreso.concepto}`,
          fecha: new Date().toLocaleString(),
          atendido_por: user?.email?.split('@')[0] || "Admin"
      });
      setIsIngresoModalOpen(false);
      setShowComprobante(true);
      setNuevoIngreso({ monto: "", concepto: "", categoria: "Ventas", metodo_pago: "Efectivo" });
      fetchData();
      await logEvent('CREADO', 'Finanzas', `Ingreso manual registrado por $${nuevoIngreso.monto}. Concepto: ${nuevoIngreso.concepto}`);
    } catch (e: any) { alert(e.message); }
  };

  const handleAddGasto = async () => {
    try {
      await addMovimiento({
        tipo: 'egreso',
        monto: Number(nuevoGasto.monto),
        utilidad_neta: 0,
        concepto: nuevoGasto.concepto,
        categoria: nuevoGasto.categoria,
        subcategoria_id: nuevoGasto.subcategoria_id || undefined,
        metodo_pago: nuevoGasto.metodo_pago,
        referencia_bancaria: nuevoGasto.referencia_bancaria,
        es_traslado: false
      });
      setIsGastoModalOpen(false);
      setNuevoGasto({ monto: "", concepto: "", categoria: "Otros", subcategoria_id: "", metodo_pago: "Efectivo", referencia_bancaria: "" });
      fetchData();
    } catch (e: any) { alert(e.message); }
  };

  const handleTraslado = async () => {
      try {
          if (nuevoTraslado.desde === nuevoTraslado.hacia) {
              alert("No puedes trasladar a la misma cuenta.");
              return;
          }
          // 1. Salida
          await addMovimiento({
              tipo: 'egreso',
              monto: Number(nuevoTraslado.monto),
              utilidad_neta: 0,
              concepto: `TRASLADO A BANK: ${nuevoTraslado.hacia}`,
              categoria: 'Otros',
              metodo_pago: nuevoTraslado.desde as any,
              referencia_bancaria: nuevoTraslado.referencia,
              es_traslado: true
          });
          // 2. Entrada
          await addMovimiento({
            tipo: 'ingreso',
            monto: Number(nuevoTraslado.monto),
            utilidad_neta: 0,
            concepto: `TRASLADO DESDE: ${nuevoTraslado.desde}`,
            categoria: 'Otros',
            metodo_pago: nuevoTraslado.hacia as any,
            referencia_bancaria: nuevoTraslado.referencia,
            es_traslado: true
        });
        setIsTrasladoModalOpen(false);
        setNuevoTraslado({ monto: "", desde: "Efectivo", hacia: "BAC", referencia: "" });
        fetchData();
      } catch (e: any) { alert(e.message); }
  };

  const handleCloseCaja = async () => {
    if (!session) return;
    const real = Number(montoCierreReal);
    if (real < session.monto_cierre_esperado && !notasCierre.trim()) {
        alert("ALERTA DE DESCUADRE: El dinero físico es menor al teórico. Debes ingresar una Nota/Motivo para justificar el faltante ante auditoría.");
        return;
    }
    try {
      await closeCaja(session.id, real, notasCierre);
      await logEvent('CIERRE_CAJA', 'Finanzas', `Cierre de caja ejecutado. Esperado: $${session.monto_cierre_esperado}. Real: $${montoCierreReal}. ${notasCierre ? `Nota: ${notasCierre}` : ''}`);
      setIsCierreModalOpen(false);
      setNotasCierre("");
      fetchData();
    } catch (e: any) { alert(e.message); }
  };

  const handleAnularMovimiento = async (m: CajaMovimiento) => {
    const confirmacion = window.confirm(`¿Estás seguro de anular el movimiento de $${m.monto}?\nConcepto: ${m.concepto}\n\nEsto creará un movimiento reverso para anular el efecto en la tesorería.`);
    if (!confirmacion) return;
    
    try {
        await addMovimiento({
            tipo: m.tipo === 'ingreso' ? 'egreso' : 'ingreso',
            monto: m.monto,
            utilidad_neta: 0,
            concepto: `ANULACIÓN: ${m.concepto}`,
            categoria: m.categoria,
            metodo_pago: m.metodo_pago,
            es_traslado: false,
            referencia_bancaria: m.referencia_bancaria
        });

        // REVERSIÓN DE DEUDA: Si el movimiento original era un PAGO DE DEUDA, restauramos el saldo
        if (m.concepto.startsWith("PAGO DEUDA:")) {
             const acreedorMatch = m.concepto.replace("PAGO DEUDA: ", "").trim();
             const deuda = deudas.find(d => d.acreedor === acreedorMatch);
             if (deuda) {
                 const nuevoSaldo = Number(deuda.saldo_pendiente) + Number(m.monto);
                 // No superamos el monto original reportado
                 const saldoFinal = nuevoSaldo > Number(deuda.monto_total) ? Number(deuda.monto_total) : nuevoSaldo;
                 
                 await supabase.from("deudas_empresa").update({
                     saldo_pendiente: saldoFinal,
                     estado: saldoFinal >= Number(deuda.monto_total) ? 'Pendiente' : 'Parcial'
                 }).eq('id', deuda.id);
             }
        }

        await logEvent('ANULACION', 'Finanzas', `Se anuló el movimiento ID: ${m.id} por $${m.monto}. Concepto: ${m.concepto}. Efecto revertido.`);
        alert('Movimiento anulado correctamente. Ajustes revertidos en balances.');
        fetchData();
    } catch (e: any) {
        alert(e.message);
    }
  };



  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      {/* Dynamic Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-neutral-100 dark:border-neutral-900 overflow-x-hidden">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-amber-600 mb-2">Punto de Venta / Caja</p>
          <h1 className="text-5xl font-black text-neutral-900 dark:text-white tracking-tighter uppercase italic">Caja Diaria</h1>
        </div>
        
        {session ? (
            <div className="flex flex-wrap items-center gap-3">
                <button onClick={() => setIsIngresoModalOpen(true)} className="px-5 py-3 bg-emerald-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-600/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
                  <ArrowUpRight className="w-4 h-4" /> Ingreso
                </button>
                <button onClick={() => setIsGastoModalOpen(true)} className="px-5 py-3 bg-rose-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-rose-600/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
                  <ArrowDownLeft className="w-4 h-4" /> Gasto
                </button>
                <button onClick={() => setIsTrasladoModalOpen(true)} className="px-5 py-3 bg-neutral-900 dark:bg-neutral-100 text-white dark:text-black rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
                  <ArrowRightLeft className="w-4 h-4" /> Traslado
                </button>
                <button onClick={() => setIsCierreModalOpen(true)} className="px-5 py-3 border-2 border-neutral-200 dark:border-neutral-800 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-neutral-50 dark:hover:bg-neutral-900 transition-all">
                  Cerrar DÍa
                </button>
            </div>
        ) : (
            <button 
              onClick={() => setIsAperturaModalOpen(true)}
              className="px-10 py-5 bg-black dark:bg-white text-white dark:text-black rounded-[2.5rem] font-black text-xs uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-2xl flex items-center gap-3"
            >
              <Plus className="w-5 h-5" /> Iniciar Día de Caja
            </button>
        )}
      </div>



      {/* Tabs Navigation PRO */}
      <div className="flex items-center gap-1.5 p-2 bg-neutral-100 dark:bg-neutral-900 rounded-[2rem] w-fit border border-neutral-200 dark:border-neutral-800">
        {[
            { id: 'hoy', label: 'Diario', icon: Wallet },
            { id: 'tesoreria', label: 'Bóveda / Bancos', icon: Building2 },
            { id: 'movimientos', label: 'Movimientos', icon: History },
            { id: 'facturas', label: 'Recibos Electrónicos', icon: FileText }
        ].map((tab) => (
            <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2.5 px-7 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                    activeTab === tab.id 
                    ? "bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-lg scale-[1.03]" 
                    : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
                }`}
            >
                <tab.icon className="w-3.5 h-3.5" />
                {tab.label}
            </button>
        ))}
      </div>

      {/* Tab Content Areas */}
      {activeTab === 'hoy' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="bg-white dark:bg-neutral-900 rounded-[3rem] p-12 border border-neutral-100 dark:border-neutral-800 shadow-2xl">
                  <h3 className="text-2xl font-black text-neutral-900 dark:text-white uppercase italic tracking-tighter mb-10">Cierre de Jornada</h3>
                  <div className="space-y-8">
                      <div className="p-8 bg-emerald-50 dark:bg-emerald-950/20 rounded-[2.5rem] border border-emerald-100 dark:border-emerald-900/30 flex items-center justify-between">
                          <div>
                              <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Ingresos Reales</p>
                              <p className="text-4xl font-black text-emerald-700 dark:text-emerald-300 italic">{formatCurrency(stats.ingresos)}</p>
                          </div>
                      </div>
                      <div className="p-8 bg-rose-50 dark:bg-rose-950/20 rounded-[2.5rem] border border-rose-100 dark:border-rose-900/30 flex items-center justify-between">
                          <div>
                              <p className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest mb-1">Egresos Totales</p>
                              <p className="text-4xl font-black text-rose-700 dark:text-rose-300 italic">{formatCurrency(stats.egresos)}</p>
                          </div>
                      </div>
                      <div className="p-10 bg-neutral-900 rounded-[2.5rem] text-white flex items-center justify-between shadow-2xl">
                          <div>
                              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-2">Efectivo Esperado en Caja</p>
                              <p className="text-5xl font-black italic tracking-tighter">{formatCurrency(session?.monto_cierre_esperado || 0)}</p>
                          </div>
                          <Wallet className="w-12 h-12 text-white/10" />
                      </div>
                  </div>
              </div>

              <div className="bg-white dark:bg-neutral-900 rounded-[3rem] p-10 border border-neutral-100 dark:border-neutral-800 shadow-xl overflow-hidden relative">
                   <h3 className="text-xl font-black text-neutral-900 dark:text-white uppercase italic tracking-tighter mb-8">AuditorIa de Flujo</h3>
                   <div className="space-y-4">
                       {movimientos.slice(0, 6).map(m => (
                           <div key={m.id} className="flex items-center justify-between py-5 border-b border-neutral-50 dark:border-neutral-800 last:border-none group">
                               <div className="flex items-center gap-5">
                                   <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black shadow-inner transition-transform group-hover:scale-110 ${m.tipo === 'ingreso' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                       {m.tipo === 'ingreso' ? '↑' : '↓'}
                                   </div>
                                   <div>
                                       <p className="text-sm font-black text-neutral-900 dark:text-white uppercase tracking-tight">{m.concepto}</p>
                                       <p className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.2em] mt-1">{m.metodo_pago} • {m.categoria}</p>
                                   </div>
                               </div>
                               <div className="text-right">
                                   <p className={`text-md font-black italic ${m.tipo === 'ingreso' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                       {m.tipo === 'ingreso' ? '+' : '-'}${Number(m.monto).toFixed(2)}
                                   </p>
                                   {m.comision_pos > 0 && <p className="text-[9px] text-rose-400 font-black animate-pulse">(-${m.comision_pos.toFixed(2)} FEE POS)</p>}
                               </div>
                           </div>
                       ))}
                       {movimientos.length === 0 && <div className="py-20 text-center text-neutral-400 italic">No hay actividad hoy aún.</div>}
                   </div>
              </div>
          </div>
      )}

      {activeTab === 'tesoreria' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 animate-in slide-in-from-bottom duration-500">
              {cuentas.map(c => (
                  <div key={c.id} className="bg-white dark:bg-neutral-900 p-10 rounded-[3rem] border border-neutral-100 dark:border-neutral-800 shadow-2xl flex flex-col justify-between group relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:scale-125 transition-all duration-500">
                          {c.tipo === 'Efectivo' ? <Wallet className="w-32 h-32" /> : <Building2 className="w-32 h-32" />}
                      </div>
                      <div className="flex justify-between items-start mb-16 relative z-10">
                          <div className="p-4 bg-neutral-900 dark:bg-white text-white dark:text-black rounded-2xl shadow-xl">
                              {c.tipo === 'Efectivo' ? <Wallet className="w-6 h-6" /> : <Building2 className="w-6 h-6" />}
                          </div>
                          <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest ${c.tipo === 'Banco' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                              {c.tipo}
                          </span>
                      </div>
                      <div className="relative z-10">
                          <p className="text-[10px] font-black text-neutral-400 uppercase tracking-[0.3em] mb-2">{c.nombre}</p>
                          <h4 className="text-4xl font-black text-neutral-900 dark:text-white tracking-tighter italic">{formatCurrency(Number(c.saldo))}</h4>
                      </div>
                  </div>
              ))}
          </div>
      )}



      {activeTab === 'movimientos' && (
          <div className="space-y-6 animate-in fade-in duration-500">
              <div className="flex justify-between items-center px-4">
                  <div>
                    <h3 className="text-3xl font-black text-neutral-900 dark:text-white uppercase italic tracking-tighter">Historial de Transacciones</h3>
                    <p className="text-xs text-neutral-500 font-bold uppercase tracking-widest mt-1">Registro contable completo</p>
                  </div>
              </div>
              <div className="bg-white dark:bg-neutral-900 rounded-[3rem] border border-neutral-100 dark:border-neutral-800 overflow-hidden shadow-2xl">
                  <table className="w-full text-left">
                      <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                          <tr>
                              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-neutral-400">Fecha / Hora</th>
                              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-neutral-400">Concepto</th>
                              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-neutral-400">Categoría</th>
                              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-neutral-400 text-right">Monto</th>
                              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-neutral-400 text-right">Acción</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                          {movimientos.map(m => (
                              <tr key={m.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                                  <td className="px-8 py-5">
                                      <p className="text-xs font-black text-neutral-900 dark:text-white uppercase">{new Date(m.created_at || '').toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                                      <p className="text-[10px] text-neutral-400 font-bold mt-1">{new Date(m.created_at || '').toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</p>
                                  </td>
                                  <td className="px-8 py-5">
                                      <p className="text-sm font-black text-neutral-900 dark:text-white uppercase tracking-tight">{m.concepto}</p>
                                      {m.es_traslado && <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[8px] font-black uppercase">Traslado</span>}
                                  </td>
                                  <td className="px-8 py-5">
                                      <span className="px-3 py-1 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 rounded-lg text-[9px] font-black uppercase tracking-widest">
                                          {m.categoria}
                                      </span>
                                  </td>
                                  <td className="px-8 py-5 text-right">
                                      <p className={`text-md font-black italic ${m.tipo === 'ingreso' ? 'text-emerald-600' : 'text-rose-600'}`}>
                                          {m.tipo === 'ingreso' ? '+' : '-'}${Number(m.monto).toFixed(2)}
                                      </p>
                                      <p className="text-[9px] font-black text-neutral-400 uppercase mt-1">{m.metodo_pago}</p>
                                  </td>
                                  <td className="px-8 py-5 text-right">
                                      {m.categoria === 'Reparaciones' && m.referencia_id && (
                                          <button 
                                              onClick={() => router.push(`/reparaciones?edit_id=${m.referencia_id}`)}
                                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-neutral-100/50 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors"
                                              title="Ir a modificar la reparación de origen"
                                          >
                                              Editar <ExternalLink className="w-3 h-3" />
                                          </button>
                                      )}
                                      {!m.concepto.startsWith('ANULACIÓN:') && !m.es_traslado && (
                                          <button 
                                              onClick={() => handleAnularMovimiento(m)}
                                              className="ml-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-900/20 dark:hover:bg-rose-900/40 text-rose-600 dark:text-rose-400 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors"
                                              title="Anular Movimiento (Crear Reversión)"
                                          >
                                              <Ban className="w-3.5 h-3.5" /> Anular
                                          </button>
                                      )}
                                  </td>
                              </tr>
                          ))}
                          {movimientos.length === 0 && (
                              <tr>
                                  <td colSpan={5} className="px-8 py-32 text-center text-neutral-400 italic">No hay historial registrado.</td>
                              </tr>
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
      )}

      {activeTab === 'facturas' && (
          <div className="space-y-6 animate-in fade-in duration-500">
              <div className="flex justify-between items-center px-4">
                  <div>
                    <h3 className="text-3xl font-black text-neutral-900 dark:text-white uppercase italic tracking-tighter">Historial de Recibos</h3>
                    <p className="text-xs text-neutral-500 font-bold uppercase tracking-widest mt-1">Reimpresión de facturas emitidas</p>
                  </div>
              </div>
              <div className="bg-white dark:bg-neutral-900 rounded-[3rem] border border-neutral-100 dark:border-neutral-800 overflow-hidden shadow-2xl">
                  <table className="w-full text-left">
                      <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                          <tr>
                              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-neutral-400">Folio / Fecha</th>
                              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-neutral-400">Concepto</th>
                              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-neutral-400 text-right">Monto Cobrado</th>
                              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-neutral-400 text-center">Acción</th>
                          </tr>
                      </thead>
                      <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                          {facturas.map(f => (
                              <tr key={f.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                                  <td className="px-8 py-5">
                                      <p className="text-sm font-black text-neutral-900 dark:text-white tracking-widest">{f.id ? f.id.split('-')[0].toUpperCase() : 'N/A'}</p>
                                      <p className="text-[10px] text-neutral-400 font-bold mt-1 uppercase">
                                          {new Date(f.created_at || '').toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })} • {new Date(f.created_at || '').toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                      </p>
                                  </td>
                                  <td className="px-8 py-5">
                                      <p className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase">{f.concepto}</p>
                                      <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mt-1">Vía {f.metodo_pago}</p>
                                  </td>
                                  <td className="px-8 py-5 text-right">
                                      <p className="text-md font-black italic text-emerald-600 dark:text-emerald-500">
                                          +${Number(f.monto).toFixed(2)}
                                      </p>
                                  </td>
                                  <td className="px-8 py-5 text-center">
                                      <button 
                                          onClick={() => {
                                              setComprobanteData({
                                                  numero_recibo: f.id ? f.id.split('-')[0].toUpperCase() : 'N/A',
                                                  cliente_nombre: "PÚBLICO EN GENERAL",
                                                  monto: Number(f.monto),
                                                  metodo_pago: f.metodo_pago as any,
                                                  concepto: f.concepto,
                                                  fecha: new Date(f.created_at || '').toLocaleString('es-ES'),
                                                  atendido_por: "Admin"
                                              });
                                              setShowComprobante(true);
                                          }}
                                          className="p-3 bg-neutral-900 dark:bg-white text-white dark:text-black hover:scale-110 rounded-xl transition-all shadow-md inline-flex items-center gap-2"
                                      >
                                          <Printer className="w-4 h-4" />
                                          <span className="text-[9px] font-black uppercase tracking-widest">Reimprimir</span>
                                      </button>
                                  </td>
                              </tr>
                          ))}
                          {facturas.length === 0 && (
                              <tr>
                                  <td colSpan={4} className="px-8 py-32 text-center text-neutral-400 italic">No hay facturas/recibos emitidos en el registro reciente.</td>
                              </tr>
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
      )}



      {/* --- Unified Modals Center --- */}
      
      {/* Apertura */}
      {isAperturaModalOpen && (
          <div onClick={() => setIsAperturaModalOpen(false)} className="fixed inset-0 bg-black/90 backdrop-blur-xl z-50 flex items-center justify-center p-4">
              <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-neutral-900 w-full max-w-sm rounded-[3.5rem] p-12 shadow-2xl animate-in zoom-in-95 duration-500 relative">
                  <button onClick={() => setIsAperturaModalOpen(false)} className="absolute top-8 right-8 p-2 text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-all z-[60]">
                      <X className="w-5 h-5" />
                  </button>
                  <div className="text-center mb-12">
                    <div className="w-20 h-20 bg-neutral-900 dark:bg-white text-white dark:text-black rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-2xl">
                        <TrendingUp className="w-10 h-10" />
                    </div>
                    <h3 className="text-3xl font-black text-neutral-900 dark:text-white uppercase tracking-tighter italic">Nueva Jornada</h3>
                    <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mt-2 px-8">Inicializa el capital físico de hoy</p>
                  </div>
                  <div className="space-y-8">
                      <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-4 text-center">Monto Inicial en Efectivo ($)</label>
                          <input 
                            type="number" 
                            className="w-full bg-neutral-50 dark:bg-neutral-800 border-none rounded-[2rem] p-6 text-4xl font-black focus:ring-8 ring-black/5 dark:ring-white/5 transition-all text-center italic"
                            placeholder="0.00"
                            value={montoApertura}
                            onChange={(e) => setMontoApertura(e.target.value)}
                            autoFocus
                          />
                      </div>
                      
                      {montoUltimoCierre !== null && Number(montoApertura) !== montoUltimoCierre && (
                          <div className="space-y-4 text-left animate-in fade-in slide-in-from-top-4 duration-300 bg-orange-50 dark:bg-orange-900/20 p-6 rounded-3xl border border-orange-100 dark:border-orange-900/50">
                              <div className="flex items-start gap-3">
                                  <AlertCircle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
                                  <div>
                                      <p className="text-[10px] font-black uppercase tracking-widest text-orange-600 dark:text-orange-400 mb-1">Descuadre Detectado</p>
                                      <p className="text-xs text-orange-700 dark:text-orange-300 font-medium">El monto introducido difiere del último cierre histórico <strong>(${montoUltimoCierre.toFixed(2)})</strong>.</p>
                                  </div>
                              </div>
                              <div className="pt-2">
                                  <label className="block text-[10px] font-black uppercase tracking-widest text-orange-600 dark:text-orange-400 mb-2">Justificación (Obligatoria)</label>
                                  <textarea 
                                    className="w-full bg-white dark:bg-black/20 border-none rounded-2xl p-4 font-medium text-sm focus:ring-2 ring-orange-500/50"
                                    placeholder="Ej: Se retiraron $100 para caja chica administrativa..."
                                    value={justificacionApertura}
                                    onChange={(e) => setJustificacionApertura(e.target.value)}
                                    rows={2}
                                  />
                              </div>
                          </div>
                      )}

                      <button onClick={handleOpenCaja} className="w-full py-6 bg-black dark:bg-white text-white dark:text-black rounded-[2rem] font-black text-sm uppercase tracking-[0.3em] shadow-2xl active:scale-95 transition-all">Iniciar Ahora</button>
                      <button onClick={() => setIsAperturaModalOpen(false)} className="w-full py-2 text-[10px] font-black text-neutral-400 uppercase tracking-widest hover:text-black transition-colors">Volver</button>
                  </div>
              </div>
          </div>
      )}

      {/* Manual Incomes/Expenses & Transfers are already functionally similar, but with specialized fields for PRO */}
      {isIngresoModalOpen && (
          <div onClick={() => setIsIngresoModalOpen(false)} className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-neutral-900 w-full max-w-lg rounded-[3rem] p-10 shadow-2xl border border-neutral-100 dark:border-neutral-800 animate-in zoom-in duration-300 relative">
                  <button onClick={() => setIsIngresoModalOpen(false)} className="absolute top-8 right-8 p-2 text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-all z-[60]">
                      <X className="w-5 h-5" />
                  </button>
                  <div className="flex items-center gap-4 mb-10 border-b pb-6 border-neutral-50 dark:border-neutral-800">
                      <div className="w-14 h-14 bg-emerald-500 text-white rounded-2xl flex items-center justify-center font-black shadow-lg shadow-emerald-500/30">↑</div>
                      <div>
                        <h3 className="text-2xl font-black text-neutral-900 dark:text-white uppercase italic tracking-tighter leading-none">Registrar Entrada</h3>
                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-1">Ingreso de flujo operativo</p>
                      </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6 mb-6">
                      <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-3 ml-1">Monto de Venta ($)</label>
                          <input type="number" className="w-full bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl p-5 font-black text-3xl italic text-emerald-600" value={nuevoIngreso.monto} onChange={(e) => setNuevoIngreso({...nuevoIngreso, monto: e.target.value})} />
                      </div>
                      <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-3 ml-1">Canal de Cobro</label>
                          <select className="w-full bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl p-5 font-black text-sm uppercase tracking-widest" value={nuevoIngreso.metodo_pago} onChange={(e) => setNuevoIngreso({...nuevoIngreso, metodo_pago: e.target.value as any})}>
                              {METODOS_PAGO.map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                      </div>
                  </div>
                  <div className="space-y-6">
                      <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-3 ml-1">Concepto Destacado</label>
                          <input placeholder="Ej: Venta de Correa Cuero Especial" className="w-full bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl p-5 font-bold text-sm" value={nuevoIngreso.concepto} onChange={(e) => setNuevoIngreso({...nuevoIngreso, concepto: e.target.value})} />
                      </div>
                      <div className="flex gap-4 pt-6">
                          <button onClick={() => setIsIngresoModalOpen(false)} className="flex-1 py-5 text-xs font-black text-neutral-400 uppercase tracking-widest">Cancelar</button>
                          <button onClick={handleAddIngreso} className="flex-2 px-10 py-5 bg-emerald-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-emerald-600/20 active:scale-95 transition-all">Sincronizar Ingreso</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Modal Egreso / Gasto */}
      {isGastoModalOpen && (
          <div onClick={() => setIsGastoModalOpen(false)} className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4">
              <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-neutral-900 w-full max-w-lg rounded-[3rem] p-10 shadow-2xl border border-neutral-100 dark:border-neutral-800 animate-in zoom-in duration-300 relative">
                  <button onClick={() => setIsGastoModalOpen(false)} className="absolute top-8 right-8 p-2 text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-all z-[60]">
                      <X className="w-5 h-5" />
                  </button>
                  <div className="flex items-center gap-4 mb-10 border-b pb-6 border-neutral-50 dark:border-neutral-800">
                      <div className="w-14 h-14 bg-rose-500 text-white rounded-2xl flex items-center justify-center font-black shadow-lg shadow-rose-500/30">↓</div>
                      <div>
                        <h3 className="text-2xl font-black text-neutral-900 dark:text-white uppercase italic tracking-tighter leading-none">Registrar Gasto</h3>
                        <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest mt-1">Salida de flujo operativo</p>
                      </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6 mb-6">
                      <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-3 ml-1">Monto del Gasto ($)</label>
                          <input type="number" className="w-full bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl p-5 font-black text-3xl italic text-rose-600" value={nuevoGasto.monto} onChange={(e) => setNuevoGasto({...nuevoGasto, monto: e.target.value})} />
                      </div>
                      <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-3 ml-1">Cuenta de Origen</label>
                          <select className="w-full bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl p-5 font-black text-sm uppercase tracking-widest" value={nuevoGasto.metodo_pago} onChange={(e) => setNuevoGasto({...nuevoGasto, metodo_pago: e.target.value as any})}>
                              {METODOS_PAGO.map(m => <option key={m} value={m}>{m}</option>)}
                          </select>
                      </div>
                  </div>
                  <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2">Categoría</label>
                            <select className="w-full bg-neutral-50 dark:bg-neutral-800 border-none rounded-xl p-4 font-black" value={nuevoGasto.categoria} onChange={(e) => setNuevoGasto({...nuevoGasto, categoria: e.target.value, subcategoria_id: ""})}>
                                {CATEGORIAS_GASTO.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2">Subcategoría (Opcional)</label>
                            <select className="w-full bg-neutral-50 dark:bg-neutral-800 border-none rounded-xl p-4 font-black" value={nuevoGasto.subcategoria_id} onChange={(e) => setNuevoGasto({...nuevoGasto, subcategoria_id: e.target.value})}>
                                <option value="">-- Ninguna --</option>
                                {subcategorias.filter(s => s.categoria_padre === nuevoGasto.categoria).map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                            </select>
                        </div>
                      </div>
                      <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2">Referencia / Voucher</label>
                          <input placeholder="# de recibo" className="w-full bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl p-5 font-bold text-sm" value={nuevoGasto.referencia_bancaria} onChange={(e) => setNuevoGasto({...nuevoGasto, referencia_bancaria: e.target.value})} />
                      </div>
                      <div>
                          <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2">Concepto / Detalle</label>
                          <input placeholder="Ej: Compra de repuestos para Rolex" className="w-full bg-neutral-50 dark:bg-neutral-800 border-none rounded-2xl p-5 font-bold text-sm" value={nuevoGasto.concepto} onChange={(e) => setNuevoGasto({...nuevoGasto, concepto: e.target.value})} />
                      </div>
                      <div className="flex gap-4 pt-4">
                          <button onClick={() => setIsGastoModalOpen(false)} className="flex-1 py-4 text-xs font-black text-neutral-400 uppercase tracking-widest">Cancelar</button>
                          <button onClick={handleAddGasto} className="flex-2 px-10 py-4 bg-rose-600 text-white rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl shadow-rose-600/20 active:scale-95 transition-all">Sincronizar Gasto</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Traslado PRO with Reference */}
      {isTrasladoModalOpen && (
          <div onClick={() => setIsTrasladoModalOpen(false)} className="fixed inset-0 bg-black/90 backdrop-blur-xl z-50 flex items-center justify-center p-4">
              <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-neutral-900 w-full max-w-md rounded-[3.5rem] p-12 shadow-2xl animate-in zoom-in-95 duration-500 relative">
                  <button onClick={() => setIsTrasladoModalOpen(false)} className="absolute top-8 right-8 p-2 text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-all z-[60]">
                      <X className="w-5 h-5" />
                  </button>
                  <div className="text-center mb-10">
                    <ArrowRightLeft className="w-12 h-12 mx-auto text-black dark:text-white mb-4" />
                    <h3 className="text-2xl font-black text-neutral-900 dark:text-white uppercase tracking-tighter italic">Traslado de Liquidez</h3>
                    <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mt-1">Intercambio entre cuentas</p>
                  </div>
                  <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                          <div>
                              <label className="block text-[9px] font-black text-neutral-400 uppercase mb-3 ml-1">Origen</label>
                              <select className="w-full bg-neutral-100 dark:bg-neutral-800 border-none rounded-2xl p-4 font-black text-xs" value={nuevoTraslado.desde} onChange={(e) => setNuevoTraslado({...nuevoTraslado, desde: e.target.value})}>
                                {METODOS_PAGO.filter(m => m !== 'POS').map(m => <option key={m} value={m}>{m}</option>)}
                              </select>
                          </div>
                          <div>
                              <label className="block text-[9px] font-black text-neutral-400 uppercase mb-3 ml-1">Destino</label>
                              <select className="w-full bg-neutral-100 dark:bg-neutral-800 border-none rounded-2xl p-4 font-black text-xs" value={nuevoTraslado.hacia} onChange={(e) => setNuevoTraslado({...nuevoTraslado, hacia: e.target.value})}>
                                {METODOS_PAGO.filter(m => m !== 'POS').map(m => <option key={m} value={m}>{m}</option>)}
                              </select>
                          </div>
                      </div>
                      <div>
                          <label className="block text-[9px] font-black text-neutral-400 uppercase mb-3 ml-1">Monto Neto ($)</label>
                          <input type="number" className="w-full bg-neutral-100 dark:bg-neutral-800 border-none rounded-3xl p-6 text-4xl font-black text-center italic" value={nuevoTraslado.monto} onChange={(e) => setNuevoTraslado({...nuevoTraslado, monto: e.target.value})} />
                      </div>
                      <div>
                          <label className="block text-[9px] font-black text-neutral-400 uppercase mb-3 ml-1">Numero de Referencia / Depósito</label>
                          <input placeholder="#123456789" className="w-full bg-neutral-100 dark:bg-neutral-800 border-none rounded-2xl p-5 font-black text-center text-sm" value={nuevoTraslado.referencia} onChange={(e) => setNuevoTraslado({...nuevoTraslado, referencia: e.target.value})} />
                      </div>
                      <button onClick={handleTraslado} className="w-full py-6 bg-black dark:bg-white text-white dark:text-black rounded-[2rem] font-black text-[10px] uppercase tracking-[0.3em] shadow-2xl active:scale-95 transition-all">Ejecutar Traslado</button>
                      <button onClick={() => setIsTrasladoModalOpen(false)} className="w-full py-2 text-[9px] font-black text-neutral-400 uppercase tracking-widest">Cancelar</button>
                  </div>
              </div>
          </div>
      )}



      {/* Modal Cierre */}
      {isCierreModalOpen && (
          <div onClick={() => setIsCierreModalOpen(false)} className="fixed inset-0 bg-black/90 backdrop-blur-xl z-50 flex items-center justify-center p-4">
              <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-neutral-900 w-full max-w-md rounded-[3.5rem] p-12 shadow-2xl animate-in zoom-in-95 duration-500 text-center relative">
                  <button onClick={() => setIsCierreModalOpen(false)} className="absolute top-8 right-8 p-2 text-neutral-400 hover:text-black dark:hover:text-white hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-full transition-all z-[60]">
                      <X className="w-5 h-5" />
                  </button>
                  <TrendingUp className="w-16 h-16 mx-auto text-black dark:text-white mb-6" />
                  <h3 className="text-3xl font-black text-neutral-900 dark:text-white uppercase tracking-tighter italic mb-2">Cierre de Jornada</h3>
                  <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-10">Verificación de fondo físico</p>
                  
                  <div className="space-y-8">
                      {session?.abierta_por !== user?.id && (
                          <div className="bg-rose-50 dark:bg-rose-900/20 p-6 rounded-3xl border border-rose-100 dark:border-rose-900/50 flex items-start gap-4 text-left animate-in fade-in zoom-in-95">
                              <AlertCircle className="w-6 h-6 text-rose-500 shrink-0 mt-0.5" />
                              <div>
                                  <p className="text-[10px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400 mb-1">Identidad Delegada</p>
                                  <p className="text-xs text-rose-700 dark:text-rose-300 font-medium">Atención: Esta caja fue abierta por otro usuario. Al cerrarla, asumirás la responsabilidad compartida del arqueo final y sus descuadres.</p>
                              </div>
                          </div>
                      )}

                      <div className="p-8 bg-neutral-50 dark:bg-neutral-800 rounded-[2rem]">
                          <p className="text-[10px] font-black uppercase text-neutral-400 mb-2 tracking-widest">Balance Teórico (Sistema)</p>
                          <p className="text-4xl font-black italic text-neutral-900 dark:text-white">${session?.monto_cierre_esperado.toFixed(2)}</p>
                      </div>

                      <div className="space-y-4">
                          <label className="block text-[10px] font-black uppercase tracking-widest text-neutral-400">¿Cuánto Efectivo hay en la Gaveta? ($)</label>
                          <input 
                            type="number" 
                            className="w-full bg-neutral-50 dark:bg-neutral-800 border-none rounded-3xl p-6 text-4xl font-black focus:ring-8 ring-black/5 dark:ring-white/5 transition-all text-center italic"
                            placeholder="0.00"
                            value={montoCierreReal}
                            onChange={(e) => setMontoCierreReal(e.target.value)}
                            autoFocus
                          />
                      </div>

                      {Number(montoCierreReal) < (session?.monto_cierre_esperado || 0) && (
                          <div className="space-y-4 text-left animate-in fade-in slide-in-from-top-4 duration-300">
                              <label className="block text-[10px] font-black uppercase tracking-widest text-rose-500">Motivo del Faltante (Obligatorio)</label>
                              <textarea 
                                className="w-full bg-rose-50 dark:bg-rose-900/20 border-none rounded-2xl p-4 font-medium text-sm focus:ring-2 ring-rose-500/50"
                                placeholder="Ej: Hubo un pago de $20 a un proveedor extra..."
                                value={notasCierre}
                                onChange={(e) => setNotasCierre(e.target.value)}
                                rows={2}
                              />
                          </div>
                      )}

                      <div className="pt-4 space-y-3">
                        <button onClick={handleCloseCaja} className="w-full py-5 bg-black dark:bg-white text-white dark:text-black rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] shadow-2xl active:scale-95 transition-all">Finalizar y Guardar</button>
                        <button onClick={() => setIsCierreModalOpen(false)} className="w-full py-2 text-[10px] font-black text-neutral-400 uppercase tracking-widest">Seguir Operando</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Comprobante Modal */}
      {showComprobante && comprobanteData && (
          <ComprobantePago 
              data={comprobanteData}
              onClose={() => {
                  setShowComprobante(false);
                  setComprobanteData(null);
              }}
          />
      )}



    </div>
  );
}
