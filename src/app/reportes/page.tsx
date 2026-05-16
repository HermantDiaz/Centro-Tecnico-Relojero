"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { PieChart, TrendingUp, History, CalendarDays, Building2, CheckCircle2, Search, X, Calendar, ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownRight, Info, Plus, Trash2, Save, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCaja } from "@/hooks/useCaja";

const CATEGORIAS_GASTO = ["Compras e Inventario", "Operaciones Fijas", "Planilla y Comisiones", "Marketing y Publicidad", "Servicios Básicos", "Impuestos y Finanzas", "Otros"];

interface CajaSesion {
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
  perfiles_apertura?: { email: string };
  perfiles_cierre?: { email: string };
}

interface MovimientoDetalle {
    descripcion: string;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
}

interface Movimiento {
    id: string;
    tipo: 'ingreso' | 'egreso';
    monto: number;
    es_traslado: boolean;
    created_at: string;
    concepto?: string;
    sesion_id?: string;
    metodo_pago?: string;
    categoria?: string;
    subcategoria_id?: string;
    caja_movimientos_detalles?: MovimientoDetalle[];
}

export default function ReportesPage() {
  const { rol, user, loading: authLoading } = useAuth();
  const { justifyShortage } = useCaja();
  const router = useRouter();
  
  const [sesiones, setSesiones] = useState<CajaSesion[]>([]);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'egresos'>('dashboard');

  // Justificación de Faltantes
  const [isJustifyModalOpen, setIsJustifyModalOpen] = useState(false);
  const [justifyExpenses, setJustifyExpenses] = useState<Array<{monto: string, concepto: string, categoria: string, subcategoria_id?: string}>>([]);
  const [isSavingJustify, setIsSavingJustify] = useState(false);
  const [subcategorias, setSubcategorias] = useState<{id: string, nombre: string, categoria_padre: string}[]>([]);
  
  // Balance General States
  const [saldosCobrar, setSaldosCobrar] = useState(0);
  const [capitalDisponible, setCapitalDisponible] = useState(0);
  const [deudasTotales, setDeudasTotales] = useState(0);
  const [subcategoriasMap, setSubcategoriasMap] = useState<Map<string, string>>(new Map());
  
  const [fetching, setFetching] = useState(true);

  // Chart States
  const [timeFilter, setTimeFilter] = useState<'7d' | '30d' | '12m' | 'month' | 'all'>('7d');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [hoverData, setHoverData] = useState<{label: string, ingreso: number, egreso: number} | null>(null);

  // Drill-down state
  const [drillDownItem, setDrillDownItem] = useState<{ type: 'concept' | 'subcategory', value: string, name: string } | null>(null);
  const [expandedMovId, setExpandedMovId] = useState<string | null>(null);
  const [selectedSnapshotData, setSelectedSnapshotData] = useState<{label: string, ingreso: number, egreso: number} | null>(null);

  // Turno modal state
  const [selectedSesionForDetails, setSelectedSesionForDetails] = useState<CajaSesion | null>(null);

  // Lock body scroll when drawer/modal is open
  useEffect(() => {
    if (drillDownItem || selectedSesionForDetails || selectedSnapshotData) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => { document.body.style.overflow = 'unset'; };
  }, [drillDownItem, selectedSesionForDetails, selectedSnapshotData]);

  useEffect(() => {
    if (user && rol === 'admin') {
        const fetchReportes = async () => {
            setFetching(true);
            try {
                // 1. Fetch Sesiones / Turnos
                const { data: ses, error: sesError } = await supabase
                    .from('caja_sesiones')
                    .select('*')
                    .order('fecha_apertura', { ascending: false });
                
                if (sesError) console.error("Error fetching sesiones:", sesError);
                if (ses) setSesiones(ses as any);

                // 2. Fetch Movimientos para el P&L Global (Límite 12 meses por seguridad)
                const limiteDoceMeses = new Date();
                limiteDoceMeses.setFullYear(limiteDoceMeses.getFullYear() - 1);
                limiteDoceMeses.setDate(1);

                const { data: movs, error: movsError } = await supabase
                    .from('caja_movimientos')
                    .select(`
                        id, tipo, monto, es_traslado, created_at, concepto, sesion_id, metodo_pago, categoria, subcategoria_id,
                        caja_movimientos_detalles (
                            descripcion, cantidad, precio_unitario, subtotal
                        )
                    `)
                    .gte('created_at', limiteDoceMeses.toISOString())
                    .order('created_at', { ascending: true });
                
                if (movsError) console.error("Error fetching movs:", movsError);
                if (movs) setMovimientos(movs as any);

                // Fetch Subcategories Map
                const { data: subcats } = await supabase.from('caja_subcategorias').select('id, nombre');
                if (subcats) {
                    const map = new Map();
                    subcats.forEach((s: any) => map.set(s.id, s.nombre));
                    setSubcategoriasMap(map);
                }

                // 3. Balance General
                const { data: cts } = await supabase.from('tesoreria_cuentas').select('saldo');
                if (cts) {
                    setCapitalDisponible(cts.reduce((acc, c) => acc + Number(c.saldo), 0));
                }

                const { data: dds } = await supabase.from('deudas_empresa').select('saldo_pendiente, estado').neq('estado', 'Pagado');
                if (dds) {
                    setDeudasTotales(dds.reduce((acc, d) => acc + Number(d.saldo_pendiente), 0));
                }

                const { data: reps } = await supabase.from('reparaciones').select('saldo_pendiente').gt('saldo_pendiente', 0);
                if (reps) {
                    setSaldosCobrar(reps.reduce((acc, r) => acc + Number(r.saldo_pendiente), 0));
                }

                // Fetch Subcategories
                const { data: scs } = await supabase.from('caja_subcategorias').select('id, nombre, categoria_padre').order('nombre');
                if (scs) setSubcategorias(scs);
            } catch (e) {
                console.error(e);
            } finally {
                setFetching(false);
            }
        };

        fetchReportes();
    }
  }, [user, rol]);

  const handleSaveJustify = async () => {
      if (!selectedSesionForDetails) return;
      setIsSavingJustify(true);
      try {
          const validExpenses = justifyExpenses.filter(e => Number(e.monto) > 0 && e.concepto.trim());
          if (validExpenses.length === 0) {
              alert("Debes ingresar al menos un gasto válido.");
              return;
          }

          const totalJustificado = validExpenses.reduce((acc, e) => acc + Number(e.monto), 0);
          if (Math.abs(totalJustificado - Math.abs(Number(selectedSesionForDetails.diferencia))) > 0.01) {
              const confirm = window.confirm(`El total justificado ($${totalJustificado.toFixed(2)}) no coincide exactamente con el faltante ($${Math.abs(Number(selectedSesionForDetails.diferencia)).toFixed(2)}).\n\n¿Deseas proceder de todas formas? El balance del turno se ajustará según lo ingresado.`);
              if (!confirm) return;
          }

          await justifyShortage(selectedSesionForDetails.id, validExpenses as any);
          
          setIsJustifyModalOpen(false);
          setSelectedSesionForDetails(null);
          // Refresh data
          window.location.reload(); // Simple refresh to avoid complex state sync
      } catch (e: any) {
          alert("Error al justificar: " + e.message);
      } finally {
          setIsSavingJustify(false);
      }
  };

  const movimientosValidos = useMemo(() => {
      const movs = [...movimientos].sort((a,b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
      const toRemove = new Set<string>();
      
      const anulaciones = movs.filter(m => m.concepto?.startsWith('ANULACIÓN: '));
      
      anulaciones.forEach(anul => {
          const originalConcepto = anul.concepto!.replace('ANULACIÓN: ', '');
          const originalTipo = anul.tipo === 'ingreso' ? 'egreso' : 'ingreso';
          const originalMonto = anul.monto;
          
          const target = movs.find(m => 
              m.tipo === originalTipo && 
              m.monto === originalMonto && 
              m.concepto === originalConcepto && 
              new Date(m.created_at) <= new Date(anul.created_at) &&
              !toRemove.has(m.id)
          );
          
          if (target) {
              toRemove.add(target.id);
              toRemove.add(anul.id);
          }
      });
      
      return movs.filter(m => !toRemove.has(m.id));
  }, [movimientos]);

  const globalStats = useMemo(() => {
      const statsIngresos = new Map<string, number>();
      const statsEgresos = new Map<string, number>();
      const statsSubcategorias = new Map<string, {monto: number, count: number}>();
      let ingresos = 0;
      let egresos = 0;

      let limitDate = new Date(0);
      const now = new Date();
      if (timeFilter === '7d') limitDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
      if (timeFilter === '30d') limitDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
      if (timeFilter === '12m') limitDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);

      movimientosValidos.forEach(m => {
          if (m.es_traslado) return;
          const mDate = new Date(m.created_at);
          
          let isIncluded = false;
          if (timeFilter === 'month') {
              isIncluded = mDate.getMonth() === selectedMonth && mDate.getFullYear() === selectedYear;
          } else if (timeFilter === 'all') {
              isIncluded = true;
          } else {
              isIncluded = mDate >= limitDate;
          }

          if (!isIncluded) return;
          
          if (m.tipo === 'ingreso') {
              ingresos += Number(m.monto);
              if (m.concepto) statsIngresos.set(m.concepto, (statsIngresos.get(m.concepto) || 0) + Number(m.monto));
          } else if (m.tipo === 'egreso') {
              egresos += Number(m.monto);
              if (m.concepto) statsEgresos.set(m.concepto, (statsEgresos.get(m.concepto) || 0) + Number(m.monto));
              if (m.subcategoria_id) {
                  const existing = statsSubcategorias.get(m.subcategoria_id) || {monto: 0, count: 0};
                  statsSubcategorias.set(m.subcategoria_id, {
                      monto: existing.monto + Number(m.monto),
                      count: existing.count + 1
                  });
              }
          }
      });

      const descOrder = (a: any, b: any) => b.monto - a.monto;
      const topIngresos = Array.from(statsIngresos, ([concepto, monto]) => ({ concepto, monto })).sort(descOrder).slice(0, 5);
      const topEgresos = Array.from(statsEgresos, ([concepto, monto]) => ({ concepto, monto })).sort(descOrder).slice(0, 5);
      
      const topSubcategorias = Array.from(statsSubcategorias, ([subcategoria_id, data]) => ({ 
          id: subcategoria_id,
          nombre: subcategoriasMap.get(subcategoria_id) || 'Desconocida', 
          ...data 
      })).sort(descOrder).slice(0, 5);

      return { ingresos, egresos, margen: ingresos - egresos, topIngresos, topEgresos, topSubcategorias };
  }, [movimientosValidos, timeFilter, selectedMonth, selectedYear, subcategoriasMap]);

  const chartData = useMemo(() => {
    const dataMap = new Map<string, {ingreso: number, egreso: number}>();
    const now = new Date();
    
    // 1. Initialise the map to guarantee chronological order and no gaps
    if (timeFilter === '7d') {
        for (let i = 6; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
            dataMap.set(d.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' }), { ingreso: 0, egreso: 0 });
        }
    } else if (timeFilter === '30d') {
        for (let i = 29; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
            dataMap.set(d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }), { ingreso: 0, egreso: 0 });
        }
    } else if (timeFilter === 'month') {
        const daysInMonth = new Date(selectedYear, selectedMonth + 1, 0).getDate();
        for (let i = 1; i <= daysInMonth; i++) {
            const d = new Date(selectedYear, selectedMonth, i);
            dataMap.set(d.toLocaleDateString('es-ES', { day: 'numeric' }), { ingreso: 0, egreso: 0 });
        }
    } else if (timeFilter === '12m') {
        for (let i = 11; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            dataMap.set(d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }), { ingreso: 0, egreso: 0 });
        }
    } else if (timeFilter === 'all') {
        let minYear = now.getFullYear();
        if (movimientos.length > 0) {
            // Arrays might be mapped in any order, so check all for safest minYear
            movimientos.forEach(m => {
                const y = new Date(m.created_at).getFullYear();
                if (y < minYear) minYear = y;
            });
        }
        for (let y = minYear; y <= now.getFullYear(); y++) {
            dataMap.set(y.toString(), { ingreso: 0, egreso: 0 });
        }
    }

    // 2. Sum up movements
    movimientosValidos.forEach(m => {
        if (m.es_traslado) return;
        const md = new Date(m.created_at);
        let key = '';
        
        if (timeFilter === '7d') {
            key = md.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' });
        } else if (timeFilter === '30d') {
            key = md.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
        } else if (timeFilter === 'month') {
            if (md.getMonth() === selectedMonth && md.getFullYear() === selectedYear) {
                key = md.toLocaleDateString('es-ES', { day: 'numeric' });
            }
        } else if (timeFilter === '12m') {
            const dt = new Date(md.getFullYear(), md.getMonth(), 1);
            key = dt.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
        } else if (timeFilter === 'all') {
            key = md.getFullYear().toString();
        }

        if (dataMap.has(key)) {
            const item = dataMap.get(key)!;
            if (m.tipo === 'ingreso') item.ingreso += Number(m.monto);
            else if (m.tipo === 'egreso') item.egreso += Number(m.monto);
        }
    });

    return Array.from(dataMap.entries()).map(([label, val]) => ({ label, ...val }));
  }, [movimientosValidos, timeFilter, selectedMonth, selectedYear]);

  const maxChartValue = useMemo(() => {
      let max = 0;
      chartData.forEach(d => {
          if (d.ingreso > max) max = d.ingreso;
          if (d.egreso > max) max = d.egreso;
      });
      return max || 1;
  }, [chartData]);

  if (authLoading || fetching) return (
    <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-neutral-200 border-t-black dark:border-t-white rounded-full animate-spin"></div>
    </div>
  );

  if (rol !== 'admin') {
      if (!authLoading) router.push('/');
      return null;
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-neutral-100 dark:border-neutral-900">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-600 mb-2">Inteligencia de Negocios</p>
          <h1 className="text-5xl font-black text-neutral-900 dark:text-white tracking-tighter uppercase italic">Analítica Corporativa</h1>
        </div>
      </div>

      {/* Tabs Navigation PRO */}
      <div className="flex items-center gap-1.5 p-2 bg-neutral-100 dark:bg-neutral-900 rounded-[2rem] w-fit border border-neutral-200 dark:border-neutral-800">
        {[
            { id: 'dashboard', label: 'Visión Global', icon: PieChart },
            { id: 'egresos', label: 'Explorador de Egresos', icon: Search }
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

      {activeTab === 'dashboard' && (
        <div className="space-y-8 animate-in fade-in">


      {/* Corporate Dashboard Stats (Balance General) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-8 bg-neutral-900 dark:bg-neutral-900 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden group">
              <p className="text-[10px] font-black uppercase text-neutral-400 tracking-widest mb-1 relative z-10">Capital Disponible (Vault)</p>
              <h2 className="text-4xl font-black tracking-tighter relative z-10">${capitalDisponible.toFixed(2)}</h2>
              <div className="mt-4 flex items-center gap-2 text-emerald-400 font-bold text-[10px] relative z-10 uppercase tracking-widest">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Efectivo + Bancos
              </div>
              <Building2 className="absolute -bottom-4 -right-4 w-24 h-24 text-white/5 group-hover:scale-110 transition-transform" />
          </div>

          <div className="p-8 bg-white dark:bg-neutral-900 rounded-[2.5rem] border border-neutral-100 dark:border-neutral-800 shadow-xl border-b-4 border-b-blue-500">
              <p className="text-[10px] font-black uppercase text-neutral-400 tracking-widest mb-1">Cuentas por Cobrar</p>
              <h2 className="text-4xl font-black text-neutral-900 dark:text-white tracking-tighter">${saldosCobrar.toFixed(2)}</h2>
              <p className="mt-4 text-[10px] font-bold text-blue-500 uppercase italic">Capital en reparaciones</p>
          </div>

          <div className="p-8 bg-white dark:bg-neutral-900 rounded-[2.5rem] border border-neutral-100 dark:border-neutral-800 shadow-xl border-b-4 border-b-rose-500">
              <p className="text-[10px] font-black uppercase text-neutral-400 tracking-widest mb-1">Pasivos Totales (Deudas)</p>
              <h2 className="text-4xl font-black text-rose-600 tracking-tighter">${deudasTotales.toFixed(2)}</h2>
              <p className="mt-4 text-[10px] font-bold text-rose-400 uppercase italic">Obligaciones pendientes</p>
          </div>

          <div className="p-8 bg-black dark:bg-neutral-800 rounded-[2.5rem] shadow-2xl">
              <p className="text-[10px] font-black uppercase text-neutral-400 tracking-widest mb-1">Liquidez Total Efectiva</p>
              <h2 className="text-4xl font-black text-white italic tracking-tighter">${(capitalDisponible + saldosCobrar - deudasTotales).toFixed(2)}</h2>
              <p className="mt-4 text-[10px] font-bold text-emerald-500 uppercase italic">(Activos - Pasivos)</p>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Ingresos vs Egresos */}
          <div className="lg:col-span-3 bg-white dark:bg-neutral-900 rounded-[3rem] border border-neutral-100 dark:border-neutral-800 p-10 shadow-2xl">
              <h4 className="text-sm font-black text-neutral-400 uppercase tracking-widest mb-8 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" /> Flujo de Efectivo Histórico (Global Acumulado)
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-4">
                  <div>
                      <div className="flex justify-between text-xs font-black uppercase mb-2">
                          <span className="text-emerald-600">Ingresos Operativos</span>
                          <span className="text-emerald-600">${globalStats.ingresos.toFixed(2)}</span>
                      </div>
                      <div className="h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${globalStats.ingresos > 0 ? 100 : 0}%` }}></div>
                      </div>
                  </div>
                  <div>
                      <div className="flex justify-between text-xs font-black uppercase mb-2">
                          <span className="text-rose-600">Gastos / Egresos</span>
                          <span className="text-rose-600">${globalStats.egresos.toFixed(2)}</span>
                      </div>
                      <div className="h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                          <div className="h-full bg-rose-500 rounded-full" style={{ width: `${globalStats.ingresos > 0 ? Math.min((globalStats.egresos / globalStats.ingresos) * 100, 100) : 0}%` }}></div>
                      </div>
                  </div>
                  <div>
                      <div className="flex justify-between text-xs font-black uppercase mb-2">
                          <span className={globalStats.margen >= 0 ? 'text-blue-500' : 'text-rose-500'}>Margen Neto</span>
                          <span className={globalStats.margen >= 0 ? 'text-blue-500' : 'text-rose-500'}>${globalStats.margen.toFixed(2)}</span>
                      </div>
                      <div className="h-2 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${globalStats.margen >= 0 ? 'bg-blue-500' : 'bg-rose-500'}`} style={{ width: `${globalStats.ingresos > 0 ? Math.abs((globalStats.margen / globalStats.ingresos) * 100) : 0}%` }}></div>
                      </div>
                  </div>
              </div>
          </div>
      </div>

      {/* Top Movimientos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6 relative z-10 w-full mb-8">
          <div className="bg-white dark:bg-neutral-900 rounded-[3rem] border border-neutral-100 dark:border-neutral-800 p-8 shadow-2xl">
              <h4 className="text-xl font-black text-neutral-900 dark:text-white uppercase tracking-tighter italic mb-1">Top Ingresos</h4>
              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-6">Conceptos más rentables</p>
              <div className="space-y-4">
                  {globalStats.topIngresos.map((ing, i) => (
                      <button 
                        key={i} 
                        onClick={() => setDrillDownItem({ type: 'concept', value: ing.concepto, name: ing.concepto })}
                        className="w-full flex justify-between items-center bg-emerald-50/50 dark:bg-emerald-900/10 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 hover:scale-[1.02] active:scale-95 transition-all group"
                      >
                          <div className="flex items-center gap-3 truncate pr-4">
                              <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                              <span className="font-bold text-sm text-neutral-700 dark:text-neutral-300 truncate">{ing.concepto}</span>
                          </div>
                          <span className="font-black text-emerald-600 dark:text-emerald-400 shrink-0">${ing.monto.toFixed(2)}</span>
                      </button>
                  ))}
                  {globalStats.topIngresos.length === 0 && (
                      <div className="text-center py-8 text-neutral-400 italic text-sm font-medium">No hay datos suficientes.</div>
                  )}
              </div>
          </div>
          
          <div className="bg-white dark:bg-neutral-900 rounded-[3rem] border border-neutral-100 dark:border-neutral-800 p-8 shadow-2xl">
              <h4 className="text-xl font-black text-neutral-900 dark:text-white uppercase tracking-tighter italic mb-1">Top Gastos</h4>
              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-6">Desglose de mayores egresos</p>
              <div className="space-y-4">
                  {globalStats.topEgresos.map((egr, i) => (
                      <button 
                        key={i} 
                        onClick={() => setDrillDownItem({ type: 'concept', value: egr.concepto, name: egr.concepto })}
                        className="w-full flex justify-between items-center bg-rose-50/50 dark:bg-rose-900/10 p-4 rounded-2xl border border-rose-100 dark:border-rose-900/30 hover:scale-[1.02] active:scale-95 transition-all group"
                      >
                          <div className="flex items-center gap-3 truncate pr-4">
                              <ArrowDownRight className="w-3.5 h-3.5 text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                              <span className="font-bold text-sm text-neutral-700 dark:text-neutral-300 truncate">{egr.concepto}</span>
                          </div>
                          <span className="font-black text-rose-600 dark:text-rose-400 shrink-0">${egr.monto.toFixed(2)}</span>
                      </button>
                  ))}
                  {globalStats.topEgresos.length === 0 && (
                      <div className="text-center py-8 text-neutral-400 italic text-sm font-medium">No hay datos suficientes.</div>
                  )}
              </div>
          </div>

          <div className="bg-white dark:bg-neutral-900 rounded-[3rem] border border-neutral-100 dark:border-neutral-800 p-8 shadow-2xl flex flex-col">
              <div className="flex justify-between items-start mb-6">
                  <div>
                      <h4 className="text-xl font-black text-neutral-900 dark:text-white uppercase tracking-tighter italic mb-1">Fugas por Subcategoría</h4>
                      <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Frecuencia y volumen</p>
                  </div>
                  <button onClick={() => setActiveTab('egresos')} className="text-[9px] font-black bg-neutral-100 dark:bg-neutral-800 text-neutral-500 hover:text-white hover:bg-black px-3 py-2 rounded-xl transition-all uppercase tracking-widest shrink-0 shadow-sm border border-neutral-200 dark:border-neutral-700">
                      Explorar
                  </button>
              </div>
              <div className="space-y-4 flex-1">
                  {globalStats.topSubcategorias.map((sub, i) => (
                      <button 
                        key={i} 
                        onClick={() => setDrillDownItem({ type: 'subcategory', value: sub.id, name: sub.nombre })}
                        className="w-full flex justify-between items-center bg-amber-50/50 dark:bg-amber-900/10 p-4 rounded-2xl border border-amber-100 dark:border-amber-900/30 hover:scale-[1.02] active:scale-95 transition-all group text-left"
                      >
                          <div className="min-w-0 pr-4">
                              <div className="flex items-center gap-2">
                                <History className="w-3 h-3 text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                <p className="font-bold text-sm text-neutral-700 dark:text-neutral-300 truncate">{sub.nombre}</p>
                              </div>
                              <p className="text-[10px] font-black text-amber-600 dark:text-amber-500 uppercase mt-0.5">{sub.count} registros</p>
                          </div>
                          <span className="font-black text-rose-600 dark:text-rose-400 shrink-0">-${sub.monto.toFixed(2)}</span>
                      </button>
                  ))}
                  {globalStats.topSubcategorias.length === 0 && (
                      <div className="text-center py-8 text-neutral-400 italic text-sm font-medium">Asigna subcategorías al registrar gastos.</div>
                  )}
              </div>
          </div>
      </div>

      {/* --- CHART COMPONENT --- */}
      <div className="bg-white dark:bg-neutral-900 rounded-[3rem] border border-neutral-100 dark:border-neutral-800 p-8 md:p-12 shadow-2xl overflow-visible mt-6 relative z-10 w-full">
          <div className="flex flex-col md:flex-row justify-between md:items-center mb-16 gap-6">
              <div>
                  <h4 className="text-2xl font-black text-neutral-900 dark:text-white uppercase tracking-tighter italic">Comportamiento P&L</h4>
                  <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mt-1">Evolución en el tiempo (Ingresos vs Egresos)</p>
              </div>
              <div className="flex bg-neutral-100 dark:bg-neutral-800 rounded-full p-1 w-full md:w-auto overflow-x-auto no-scrollbar">
                  {['7d', '30d', '12m', 'month', 'all'].map(tf => (
                      <button 
                        key={tf}
                        onClick={() => setTimeFilter(tf as any)}
                        className={`flex-1 md:flex-none px-5 py-3 rounded-full text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer whitespace-nowrap ${timeFilter === tf ? 'bg-white dark:bg-neutral-900 text-black dark:text-white shadow-xl scale-105 z-10' : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'}`}
                      >
                          {tf === '7d' ? '7 Días' : tf === '30d' ? '30 Días' : tf === '12m' ? '1 Año' : tf === 'month' ? 'Mensual' : 'Histórico'}
                      </button>
                  ))}
              </div>
          </div>

          {timeFilter === 'month' && (
              <div className="flex items-center gap-6 mb-12 animate-in slide-in-from-top-4 duration-500 bg-neutral-50 dark:bg-neutral-800/30 p-6 rounded-[2rem] border border-neutral-100 dark:border-neutral-800">
                  <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-neutral-400" />
                      <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500">Periodo de Auditoría:</span>
                  </div>
                  <div className="flex items-center gap-4">
                      <button 
                        onClick={() => {
                            if (selectedMonth === 0) {
                                setSelectedMonth(11);
                                setSelectedYear(selectedYear - 1);
                            } else {
                                setSelectedMonth(selectedMonth - 1);
                            }
                        }}
                        className="p-3 rounded-full bg-white dark:bg-neutral-900 shadow-md hover:bg-neutral-50 transition-all border border-neutral-100 dark:border-neutral-800"
                      >
                          <ChevronLeft className="w-4 h-4" />
                      </button>
                      <div className="text-center min-w-[140px]">
                          <p className="text-lg font-black uppercase italic tracking-tighter text-neutral-900 dark:text-white">
                              {new Date(selectedYear, selectedMonth).toLocaleDateString('es-ES', { month: 'long' })}
                          </p>
                          <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">{selectedYear}</p>
                      </div>
                      <button 
                        onClick={() => {
                            if (selectedMonth === 11) {
                                setSelectedMonth(0);
                                setSelectedYear(selectedYear + 1);
                            } else {
                                setSelectedMonth(selectedMonth + 1);
                            }
                        }}
                        className="p-3 rounded-full bg-white dark:bg-neutral-900 shadow-md hover:bg-neutral-50 transition-all border border-neutral-100 dark:border-neutral-800"
                      >
                          <ChevronRight className="w-4 h-4" />
                      </button>
                  </div>
              </div>
          )}

          {/* The Bars Area Wrapper for horizontal scrolling */}
          <div className="overflow-x-auto custom-scrollbar pb-10 pt-4 -mx-4 px-4 md:mx-0 md:px-0">
              <div className="relative h-72 sm:h-80 flex items-end justify-start gap-2 sm:gap-4 lg:gap-6 min-w-max px-4">
                  {/* Background Grid Lines optional, but let's keep it minimalist without them */}
                  
                  {chartData.map((data, i) => (
                      <div key={i} className="relative flex-1 group flex flex-col justify-end h-full mt-auto cursor-pointer min-w-[36px] sm:min-w-[48px] max-w-16 md:max-w-32"
                           onMouseEnter={() => setHoverData(data)}
                           onMouseLeave={() => setHoverData(null)}
                           onClick={() => setSelectedSnapshotData(data)}
                      >
                      {/* Egresos Bar (achter) */}
                      <div 
                          className="w-full absolute bottom-0 bg-rose-500 rounded-t-lg opacity-80 group-hover:opacity-100 transition-all duration-500 hover:z-10" 
                          style={{ height: `${(data.egreso / maxChartValue) * 100}%` }}
                      ></div>
                      
                      {/* Ingresos Bar (front) */}
                      <div 
                          className="w-[80%] absolute bottom-0 bg-emerald-500 rounded-t-lg opacity-95 shadow-sm group-hover:scale-y-[1.02] transform origin-bottom transition-all duration-500 z-10 left-[10%]" 
                          style={{ 
                               height: `${(data.ingreso / maxChartValue) * 100}%`
                          }}
                      ></div>
                      
                      {/* X Axis Label */}
                      <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 text-[9px] font-black uppercase text-neutral-400 rotate-0 truncate text-center transition-all group-hover:text-neutral-900 dark:group-hover:text-white">
                          {data.label}
                      </div>

                      {/* Floating Individual Tooltip (Mobile fallback or precise) */}
                      <div className="absolute -top-14 left-1/2 -translate-x-1/2 bg-black dark:bg-white text-white dark:text-black px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap shadow-xl z-20 pointer-events-none">
                          Margen: ${(data.ingreso - data.egreso).toFixed(0)}
                      </div>
                  </div>
              ))}
          </div>
          </div>
          
          {/* Dynamic Follow Tooltip (Fixed on Desktop) */}
          {hoverData && (
              <div className="hidden md:block absolute top-12 right-12 bg-black/90 dark:bg-white backdrop-blur-xl text-white dark:text-black p-6 rounded-[2rem] shadow-2xl animate-in fade-in duration-300 pointer-events-none z-30 min-w-[200px] ring-1 ring-white/10 dark:ring-black/10">
                  <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-4 border-b border-white/10 dark:border-black/10 pb-3">{hoverData.label}</p>
                  <div className="space-y-3">
                      <div className="flex justify-between gap-8 text-sm">
                          <span className="font-bold text-emerald-400 dark:text-emerald-600">Ingresos</span>
                          <span className="font-black italic">${hoverData.ingreso.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between gap-8 text-sm">
                          <span className="font-bold text-rose-400 dark:text-rose-600">Egresos</span>
                          <span className="font-black italic">${hoverData.egreso.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between gap-8 text-sm pt-3 border-t border-white/10 dark:border-black/10">
                          <span className="font-black">Margen</span>
                          <span className={`font-black italic ${hoverData.ingreso - hoverData.egreso >= 0 ? 'text-emerald-400 dark:text-emerald-600' : 'text-rose-400 dark:text-rose-600'}`}>${(hoverData.ingreso - hoverData.egreso).toFixed(2)}</span>
                      </div>
                  </div>
              </div>
          )}
      </div>

      <div className="mt-12">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6 px-4">
              <div className="flex items-center gap-3">
                  <History className="w-8 h-8 text-neutral-900 dark:text-white" />
                  <div>
                      <h3 className="text-2xl font-black text-neutral-900 dark:text-white uppercase italic tracking-tighter">Historial de Turnos (Cortes de Caja)</h3>
                      <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mt-1">Auditoría patrimonial retroactiva</p>
                  </div>
              </div>
              <button onClick={() => window.print()} className="px-6 py-3 bg-neutral-900 dark:bg-white text-white dark:text-black rounded-full font-black text-xs uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 transition-all">
                  Imprimir/Exportar Reporte
              </button>
          </div>
          
          <div className="bg-white dark:bg-neutral-900 rounded-[3rem] border border-neutral-100 dark:border-neutral-800 overflow-hidden shadow-2xl">
              <table className="w-full text-left">
                  <thead className="bg-neutral-50 dark:bg-neutral-800/50">
                      <tr>
                          <th className="px-10 py-7 text-[10px] font-black uppercase tracking-widest text-neutral-400">Jornada</th>
                          <th className="px-10 py-7 text-[10px] font-black uppercase tracking-widest text-neutral-400">Responsables</th>
                          <th className="px-10 py-7 text-[10px] font-black uppercase tracking-widest text-neutral-400">Estado</th>
                          <th className="px-10 py-7 text-[10px] font-black uppercase tracking-widest text-neutral-400 text-right">Espera vs. Real</th>
                          <th className="px-10 py-7 text-[10px] font-black uppercase tracking-widest text-neutral-400 text-right">Descuadre</th>
                          <th className="px-10 py-7 text-[10px] font-black uppercase tracking-widest text-neutral-400 text-center">Acciones</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                      {sesiones.map(s => (
                          <tr key={s.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors group">
                              <td className="px-10 py-7">
                                  <div className="flex items-center gap-3">
                                      <CalendarDays className="w-4 h-4 text-neutral-400" />
                                      <div>
                                        <p className="text-sm font-black text-neutral-900 dark:text-white uppercase tracking-tight">
                                            {new Date(s.fecha_apertura).toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' })}
                                        </p>
                                        <p className="text-[10px] text-neutral-400 font-bold mt-1">
                                            Abierto a las {new Date(s.fecha_apertura).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                      </div>
                                  </div>
                              </td>
                              <td className="px-10 py-7">
                                  <p className="text-xs font-black uppercase text-neutral-600 dark:text-neutral-300">
                                      <span className="text-neutral-400">Apertura:</span> {s.perfiles_apertura?.email?.split('@')[0] || s.abierta_por?.substring(0,8) || 'Desconocido'}
                                  </p>
                                  {s.fecha_cierre && (
                                      <p className="text-[10px] font-bold text-neutral-500 uppercase mt-1">
                                          Cierre: {s.perfiles_cierre?.email?.split('@')[0] || s.cerrada_por?.substring(0,8) || 'Desconocido'}
                                      </p>
                                  )}
                              </td>
                              <td className="px-10 py-7">
                                  <span className={`px-4 py-2 rounded-2xl text-[9px] font-black uppercase tracking-widest shadow-sm ${
                                      s.estado === 'abierta' ? 'bg-emerald-100 text-emerald-600' : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600'
                                  }`}>
                                      {s.estado}
                                  </span>
                              </td>
                              <td className="px-10 py-7 text-right">
                                  <p className="text-sm font-black text-neutral-900 dark:text-white italic tracking-tighter">
                                      Teórico: ${Number(s.monto_cierre_esperado).toFixed(2)}
                                  </p>
                                  {s.estado === 'cerrada' && (
                                      <p className="text-[10px] text-neutral-400 font-black uppercase mt-1">
                                          Caja Real: ${Number(s.monto_cierre_real).toFixed(2)}
                                      </p>
                                  )}
                              </td>
                              <td className="px-10 py-7 text-right">
                                  {s.estado === 'cerrada' ? (
                                      <span className={`px-3 py-1.5 rounded-lg text-xs font-black italic tracking-tighter ${
                                          Number(s.diferencia) === 0 ? 'text-emerald-500' : 'text-rose-500 bg-rose-50 dark:bg-rose-900/20'
                                      }`}>
                                          {Number(s.diferencia) > 0 ? '+' : ''}{Number(s.diferencia).toFixed(2)}
                                      </span>
                                  ) : (
                                      <span className="text-neutral-400 text-[10px] uppercase font-black">-</span>
                                  )}
                              </td>
                              <td className="px-10 py-7 text-center">
                                  <button onClick={() => setSelectedSesionForDetails(s)} className="p-3 bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black rounded-xl transition-all shadow-sm">
                                      <Search className="w-4 h-4" />
                                  </button>
                              </td>
                          </tr>
                      ))}
                      {sesiones.length === 0 && (
                          <tr>
                              <td colSpan={6} className="px-8 py-32 text-center text-neutral-400 italic font-medium">
                                  No hay turnos registrados en el sistema.
                              </td>
                          </tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>
      </div>
      )}

      {activeTab === 'egresos' && (
          <EgresosExplorerTab 
            movimientos={movimientosValidos} 
            subcategoriasMap={subcategoriasMap} 
            subcategorias={subcategorias} 
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            setSelectedMonth={setSelectedMonth}
            setSelectedYear={setSelectedYear}
          />
      )}


      {/* Drawer Desglose Auditado (Drill-down) */}
      {drillDownItem && (() => {
          // Calculate stats for selected item
          const currentMonthMovs = movimientosValidos.filter(m => {
              if (m.es_traslado) return false;
              const d = new Date(m.created_at);
              const isPeriodMatch = d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
              if (drillDownItem.type === 'concept') return isPeriodMatch && m.concepto === drillDownItem.value;
              return isPeriodMatch && m.subcategoria_id === drillDownItem.value;
          });

          const prevMonth = selectedMonth === 0 ? 11 : selectedMonth - 1;
          const prevYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
          const prevMonthMovs = movimientos.filter(m => {
              if (m.es_traslado) return false;
              const d = new Date(m.created_at);
              const isPeriodMatch = d.getMonth() === prevMonth && d.getFullYear() === prevYear;
              if (drillDownItem.type === 'concept') return isPeriodMatch && m.concepto === drillDownItem.value;
              return isPeriodMatch && m.subcategoria_id === drillDownItem.value;
          });

          const currentTotal = currentMonthMovs.reduce((acc, m) => acc + Number(m.monto), 0);
          const prevTotal = prevMonthMovs.reduce((acc, m) => acc + Number(m.monto), 0);
          const diff = prevTotal === 0 ? 100 : ((currentTotal - prevTotal) / prevTotal) * 100;

          return (
            <div className="fixed inset-0 z-[100] flex justify-end">
                <div onClick={() => setDrillDownItem(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"></div>
                <div className="relative w-full max-w-lg h-full bg-white dark:bg-neutral-900 shadow-2xl flex flex-col animate-in slide-in-from-right duration-500 border-l border-neutral-100 dark:border-neutral-800">
                    {/* Header */}
                    <div className="p-8 border-b border-neutral-100 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/30">
                        <div className="flex justify-between items-start mb-6">
                            <button onClick={() => setDrillDownItem(null)} className="p-3 rounded-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm hover:scale-110 transition-all"><X className="w-5 h-5" /></button>
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-neutral-400">Auditoría Profunda</span>
                        </div>
                        <h2 className="text-3xl font-black italic uppercase tracking-tighter leading-tight text-neutral-900 dark:text-white">{drillDownItem.name}</h2>
                        <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mt-2">{drillDownItem.type === 'concept' ? 'Análisis por Concepto' : 'Análisis por Subcategoría'}</p>
                    </div>

                    {/* Comparative Stats & List Container */}
                    <div className="p-8 space-y-6 flex-1 flex flex-col min-h-0">
                        <div className="grid grid-cols-2 gap-4 shrink-0">
                            <div className="p-5 rounded-3xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800">
                                <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-1">Total Periodo</p>
                                <p className="text-2xl font-black text-neutral-900 dark:text-white">${currentTotal.toFixed(2)}</p>
                                <p className="text-[10px] font-bold text-neutral-500 mt-1">{currentMonthMovs.length} transacciones</p>
                            </div>
                            <div className="p-5 rounded-3xl bg-neutral-50 dark:bg-neutral-800/50 border border-neutral-100 dark:border-neutral-800">
                                <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest mb-1">Vs. Mes Anterior</p>
                                <div className="flex items-center gap-2">
                                    <p className={`text-2xl font-black ${diff > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                        {diff > 0 ? '+' : ''}{diff.toFixed(1)}%
                                    </p>
                                    {diff > 0 ? <TrendingUp className="w-4 h-4 text-rose-500" /> : <ArrowDownRight className="w-4 h-4 text-emerald-500" />}
                                </div>
                                <p className="text-[10px] font-bold text-neutral-500 mt-1">Anterior: ${prevTotal.toFixed(0)}</p>
                            </div>
                        </div>

                        {/* List */}
                        <div className="flex-1 min-h-0 flex flex-col space-y-4 overflow-hidden">
                            <div className="flex justify-between items-center">
                                <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400">Historial de Movimientos</p>
                                <Info className="w-3.5 h-3.5 text-neutral-300" />
                            </div>
                            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar pb-10">
                                {currentMonthMovs.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((m, i) => (
                                    <div 
                                        key={i} 
                                        onClick={() => setExpandedMovId(expandedMovId === m.id ? null : m.id)}
                                        className={`p-5 rounded-3xl bg-white dark:bg-neutral-900 border transition-all shadow-sm cursor-pointer group ${
                                            expandedMovId === m.id ? 'border-blue-500 ring-2 ring-blue-500/10' : 'border-neutral-100 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
                                        }`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-black text-neutral-400 uppercase tracking-tighter">
                                                    {new Date(m.created_at).toLocaleDateString()} - {new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                                </span>
                                                <p className="text-xs font-black text-neutral-800 dark:text-neutral-200 leading-tight mt-1 group-hover:text-blue-500 transition-colors uppercase italic">{m.concepto || 'Sin concepto'}</p>
                                            </div>
                                            <div className="text-right">
                                                <span className={`text-base font-black italic tracking-tighter ${m.tipo === 'ingreso' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                    {m.tipo === 'ingreso' ? '+' : '-'}${Number(m.monto).toFixed(2)}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="mt-4 flex items-center justify-between">
                                            <div className="flex items-center gap-4 text-[9px] font-black uppercase text-neutral-400">
                                                <span className="flex items-center gap-1 bg-neutral-50 dark:bg-neutral-800 px-2 py-1 rounded-md"><Building2 className="w-2.5 h-2.5" /> {m.metodo_pago}</span>
                                                {m.caja_movimientos_detalles && m.caja_movimientos_detalles.length > 0 && (
                                                    <span className="flex items-center gap-1 text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-md">
                                                        {m.caja_movimientos_detalles.length} {m.caja_movimientos_detalles.length === 1 ? 'Artículo' : 'Artículos'}
                                                    </span>
                                                )}
                                            </div>
                                            <div className={`transition-transform duration-300 ${expandedMovId === m.id ? 'rotate-180' : ''}`}>
                                                <ChevronRight className="w-4 h-4 text-neutral-300" />
                                            </div>
                                        </div>

                                        {/* Expandable Details Area */}
                                        {expandedMovId === m.id && m.caja_movimientos_detalles && m.caja_movimientos_detalles.length > 0 && (
                                            <div className="mt-6 pt-6 border-t border-dashed border-neutral-100 dark:border-neutral-800 animate-in slide-in-from-top-2 duration-300">
                                                <p className="text-[9px] font-black uppercase tracking-widest text-neutral-400 mb-4 flex items-center gap-2">
                                                    <Search className="w-3 h-3" /> Desglose de Artículos
                                                </p>
                                                <div className="space-y-3">
                                                    {m.caja_movimientos_detalles.map((det, idx) => (
                                                        <div key={idx} className="flex justify-between items-center bg-neutral-50/50 dark:bg-neutral-800/20 p-3 rounded-xl border border-neutral-100/50 dark:border-neutral-800/50">
                                                            <div className="min-w-0 pr-4">
                                                                <p className="text-[11px] font-bold text-neutral-700 dark:text-neutral-300 truncate uppercase">{det.descripcion}</p>
                                                                <p className="text-[9px] font-black text-neutral-400 mt-0.5">{det.cantidad} x ${Number(det.precio_unitario).toFixed(2)}</p>
                                                            </div>
                                                            <span className="text-xs font-black text-neutral-900 dark:text-white shrink-0">${Number(det.subtotal).toFixed(2)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {currentMonthMovs.length === 0 && (
                                    <div className="text-center py-20 bg-neutral-50 dark:bg-neutral-800/30 rounded-3xl border-2 border-dashed border-neutral-100 dark:border-neutral-800">
                                        <p className="text-[10px] font-black text-neutral-400 uppercase">Sin movimientos en este periodo</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
          );
      })()}

      {/* Snapshot Modal & Print Template */}
      {selectedSnapshotData && (
          <>
          <style type="text/css" media="print">
              {`
                  body * { visibility: hidden; }
                  #snapshot-print-area, #snapshot-print-area * { visibility: visible; }
                  #snapshot-print-area { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 20px; box-shadow: none; border-radius: 0; background: white; color: black; }
                  .print-hide { display: none !important; }
                  .print-show { display: block !important; }
              `}
          </style>
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 print:p-0">
              <div className="absolute inset-0 bg-black/60 backdrop-blur-sm print-hide" onClick={() => setSelectedSnapshotData(null)}></div>
              
              <div id="snapshot-print-area" className="relative w-full max-w-md bg-white dark:bg-neutral-900 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                  {/* Header Impresión - visible solo en impresión */}
                  <div className="hidden print-show text-center border-b-2 border-black pb-4 mb-6 pt-4">
                      <h2 className="text-2xl font-black uppercase tracking-tighter">CENTRO TÉCNICO RELOJERO</h2>
                      <p className="text-xs font-bold uppercase tracking-widest mt-1">Balance Diario Rápido</p>
                  </div>

                  <div className="p-8 print:p-0">
                      <div className="flex justify-between items-start mb-8 print-hide">
                          <div>
                              <p className="text-[10px] font-black uppercase tracking-widest text-blue-500 mb-1">Corte Diario Rápido</p>
                              <h3 className="text-2xl font-black text-neutral-900 dark:text-white uppercase italic tracking-tighter">
                                  {selectedSnapshotData.label}
                              </h3>
                          </div>
                          <button onClick={() => setSelectedSnapshotData(null)} className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-full text-neutral-500 hover:text-black dark:hover:text-white transition-colors">
                              <X className="w-5 h-5" />
                          </button>
                      </div>

                      {/* Título alternativo en impresión */}
                      <div className="hidden print-show text-center mb-8">
                          <p className="text-sm font-black uppercase tracking-widest text-neutral-500 mb-1">Fecha del Corte</p>
                          <h3 className="text-xl font-black text-black uppercase italic tracking-tighter">
                              {selectedSnapshotData.label}
                          </h3>
                      </div>

                      <div className="space-y-6">
                          <div className="p-5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl print:bg-transparent print:border-b print:border-black print:rounded-none">
                              <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 mb-1">Total Ingresos</p>
                              <p className="text-3xl font-black italic text-emerald-700 dark:text-emerald-400">${selectedSnapshotData.ingreso.toFixed(2)}</p>
                          </div>
                          
                          <div className="p-5 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-900/30 rounded-2xl print:bg-transparent print:border-b print:border-black print:rounded-none">
                              <p className="text-[10px] font-black uppercase tracking-widest text-rose-600 mb-1">Total Egresos</p>
                              <p className="text-3xl font-black italic text-rose-700 dark:text-rose-400">${selectedSnapshotData.egreso.toFixed(2)}</p>
                          </div>

                          <div className="p-6 bg-black dark:bg-neutral-800 rounded-2xl text-white print:bg-transparent print:text-black print:border-4 print:border-black print:rounded-none mt-8">
                              <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 mb-2">Margen Neto Operativo</p>
                              <p className="text-4xl font-black italic tracking-tighter">${(selectedSnapshotData.ingreso - selectedSnapshotData.egreso).toFixed(2)}</p>
                          </div>
                      </div>

                      <div className="mt-8 pt-8 border-t border-neutral-100 dark:border-neutral-800 flex flex-col gap-3 print-hide">
                          <button onClick={() => window.print()} className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-xl shadow-blue-500/20 transition-all flex justify-center items-center gap-2">
                              Exportar a PDF / Imprimir
                          </button>
                          <button onClick={() => setSelectedSnapshotData(null)} className="w-full py-4 bg-transparent text-neutral-500 hover:text-black dark:hover:text-white font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all">
                              Cerrar
                          </button>
                      </div>
                      
                      {/* Footer Impresión */}
                      <div className="hidden print-show mt-16 text-center text-xs text-black border-t-2 border-black pt-4">
                          <p className="font-bold uppercase">Reporte Generado Automáticamente por CTR Inteligencia</p>
                          <p className="mt-8">Firma de Auditor: _________________________</p>
                      </div>
                  </div>
              </div>
          </div>
          </>
      )}

      {/* Modal Desglose de Turno */}
      {selectedSesionForDetails && (
          <div onClick={() => setSelectedSesionForDetails(null)} className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[80] flex items-center justify-center p-4">
              <div onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-neutral-900 w-full max-w-3xl rounded-[2rem] p-8 shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
                  <div className="flex justify-between items-center mb-6">
                      <div>
                          <h3 className="text-2xl font-black text-neutral-900 dark:text-white uppercase italic tracking-tighter">Auditoría de Turno</h3>
                          <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mt-1">
                              Sesión del {new Date(selectedSesionForDetails.fecha_apertura).toLocaleDateString()}
                          </p>
                      </div>
                      <div className="flex items-center gap-3">
                          {selectedSesionForDetails.estado === 'cerrada' && Number(selectedSesionForDetails.diferencia) < 0 && (
                              <button 
                                onClick={() => {
                                    setJustifyExpenses([{ monto: Math.abs(Number(selectedSesionForDetails.diferencia)).toString(), concepto: "", categoria: "Otros" }]);
                                    setIsJustifyModalOpen(true);
                                }}
                                className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-amber-200 transition-all"
                              >
                                  <AlertCircle className="w-4 h-4" /> Justificar Faltante
                              </button>
                          )}
                          <button onClick={() => setSelectedSesionForDetails(null)} className="p-2 bg-neutral-100 dark:bg-neutral-800 text-neutral-500 rounded-full hover:bg-black hover:text-white transition-all">
                              <X className="w-5 h-5" />
                          </button>
                      </div>
                  </div>

                  <div className="flex-1 overflow-y-auto pr-2 pb-4">
                      {movimientos.filter(m => m.sesion_id === selectedSesionForDetails.id).length === 0 ? (
                          <div className="text-center py-20 text-neutral-400 italic text-sm">No hubo movimientos extraídos en este turno.</div>
                      ) : (
                          <div className="space-y-3">
                              {movimientos.filter(m => m.sesion_id === selectedSesionForDetails.id)
                                .sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                                .map((m, i) => (
                                  <div 
                                    key={i} 
                                    onClick={() => setExpandedMovId(expandedMovId === m.id ? null : m.id)}
                                    className={`p-4 rounded-2xl border transition-all cursor-pointer group ${
                                        expandedMovId === m.id 
                                            ? 'bg-white dark:bg-neutral-800 border-blue-500 shadow-lg ring-1 ring-blue-500/10' 
                                            : 'bg-neutral-50 dark:bg-neutral-800/50 border-neutral-100 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700'
                                    }`}
                                  >
                                      <div className="flex justify-between items-center">
                                          <div className="flex gap-4 items-center">
                                              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black shadow-inner ${m.tipo === 'ingreso' ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                                                  {m.tipo === 'ingreso' ? '+' : '-'}
                                              </div>
                                              <div>
                                                  <p className="font-bold text-sm text-neutral-800 dark:text-neutral-200 group-hover:text-blue-500 transition-colors uppercase italic">{m.concepto}</p>
                                                  <div className="flex items-center gap-2 mt-0.5">
                                                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">{new Date(m.created_at).toLocaleTimeString()} • {m.metodo_pago} {m.es_traslado ? '• TRASLADO' : ''}</p>
                                                      {m.caja_movimientos_detalles && m.caja_movimientos_detalles.length > 0 && (
                                                          <span className="text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded text-[8px] font-black uppercase">
                                                              {m.caja_movimientos_detalles.length} {m.caja_movimientos_detalles.length === 1 ? 'Ítem' : 'Ítems'}
                                                          </span>
                                                      )}
                                                  </div>
                                              </div>
                                          </div>
                                          <div className="flex items-center gap-4">
                                              <div className="text-right">
                                                  <p className={`font-black italic text-lg tracking-tighter ${m.tipo === 'ingreso' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                      {m.tipo === 'ingreso' ? '+' : '-'}${m.monto.toFixed(2)}
                                                  </p>
                                              </div>
                                              <div className={`transition-transform duration-300 ${expandedMovId === m.id ? 'rotate-90 text-blue-500' : 'text-neutral-300'}`}>
                                                  <ChevronRight className="w-4 h-4" />
                                              </div>
                                          </div>
                                      </div>

                                      {/* Expandable Details Area for Turno Modal */}
                                      {expandedMovId === m.id && m.caja_movimientos_detalles && m.caja_movimientos_detalles.length > 0 && (
                                          <div className="mt-4 pt-4 border-t border-dashed border-neutral-100 dark:border-neutral-700 animate-in slide-in-from-top-2 duration-300">
                                              <div className="grid grid-cols-1 gap-2">
                                                  {m.caja_movimientos_detalles.map((det, idx) => (
                                                      <div key={idx} className="flex justify-between items-center bg-white dark:bg-neutral-900/50 p-3 rounded-xl border border-neutral-100/50 dark:border-neutral-800/50">
                                                          <div className="min-w-0 pr-4">
                                                              <p className="text-[10px] font-bold text-neutral-600 dark:text-neutral-400 uppercase truncate">{det.descripcion}</p>
                                                              <p className="text-[8px] font-black text-neutral-400 mt-0.5">{det.cantidad} x ${Number(det.precio_unitario).toFixed(2)}</p>
                                                          </div>
                                                          <span className="text-[10px] font-black text-neutral-900 dark:text-white shrink-0">${Number(det.subtotal).toFixed(2)}</span>
                                                      </div>
                                                  ))}
                                              </div>
                                          </div>
                                      )}
                                  </div>
                              ))}
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* Justify Shortage Modal */}
      {selectedSesionForDetails && (
          <JustifyShortageModal 
            isOpen={isJustifyModalOpen}
            onClose={() => setIsJustifyModalOpen(false)}
            onSave={handleSaveJustify}
            expenses={justifyExpenses}
            setExpenses={setJustifyExpenses}
            isSaving={isSavingJustify}
            subcategorias={subcategorias}
            totalFaltante={Math.abs(Number(selectedSesionForDetails.diferencia))}
          />
      )}

    </div>
  );
}

// Separate component for the Justification Modal for cleaner code
function JustifyShortageModal({ 
    isOpen, 
    onClose, 
    onSave, 
    expenses, 
    setExpenses, 
    isSaving,
    subcategorias,
    totalFaltante 
}: any) {
    if (!isOpen) return null;

    const currentTotal = expenses.reduce((acc: number, e: any) => acc + (Number(e.monto) || 0), 0);
    const difference = totalFaltante - currentTotal;

    const addExpense = () => {
        setExpenses([...expenses, { monto: "", concepto: "", categoria: "Otros" }]);
    };

    const removeExpense = (index: number) => {
        setExpenses(expenses.filter((_: any, i: number) => i !== index));
    };

    const updateExpense = (index: number, updates: any) => {
        setExpenses(expenses.map((e: any, i: number) => i === index ? { ...e, ...updates } : e));
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
            <div className="bg-white dark:bg-neutral-900 w-full max-w-2xl rounded-[2.5rem] p-10 shadow-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300">
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h3 className="text-3xl font-black text-neutral-900 dark:text-white uppercase italic tracking-tighter leading-tight">Justificar Faltante</h3>
                        <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mt-2">
                            El monto original del faltante es de <span className="text-rose-500">${totalFaltante.toFixed(2)}</span>
                        </p>
                    </div>
                    <button onClick={onClose} className="p-3 bg-neutral-100 dark:bg-neutral-800 text-neutral-500 rounded-full hover:rotate-90 transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 space-y-6 mb-8">
                    {expenses.map((exp: any, index: number) => (
                        <div key={index} className="p-6 bg-neutral-50 dark:bg-neutral-800/50 rounded-3xl border border-neutral-100 dark:border-neutral-800 relative group animate-in slide-in-from-bottom-2">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase text-neutral-400 tracking-widest ml-1">Monto ($)</label>
                                    <input 
                                        type="number"
                                        value={exp.monto}
                                        onChange={(e) => updateExpense(index, { monto: e.target.value })}
                                        className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                                        placeholder="0.00"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-black uppercase text-neutral-400 tracking-widest ml-1">Categoría</label>
                                    <select 
                                        value={exp.categoria}
                                        onChange={(e) => updateExpense(index, { categoria: e.target.value, subcategoria_id: undefined })}
                                        className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                                    >
                                        {CATEGORIAS_GASTO.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[9px] font-black uppercase text-neutral-400 tracking-widest ml-1">Concepto / Motivo</label>
                                    <input 
                                        type="text"
                                        value={exp.concepto}
                                        onChange={(e) => updateExpense(index, { concepto: e.target.value })}
                                        className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                                        placeholder="Ej: Pago de almuerzos, Compra de insumos urgentes..."
                                    />
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[9px] font-black uppercase text-neutral-400 tracking-widest ml-1">Subcategoría (Opcional)</label>
                                    <select 
                                        value={exp.subcategoria_id || ""}
                                        onChange={(e) => updateExpense(index, { subcategoria_id: e.target.value })}
                                        className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                                    >
                                        <option value="">Ninguna</option>
                                        {subcategorias.filter((s:any) => s.categoria_padre === exp.categoria).map((s:any) => (
                                            <option key={s.id} value={s.id}>{s.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            {expenses.length > 1 && (
                                <button 
                                    onClick={() => removeExpense(index)}
                                    className="absolute -top-3 -right-3 p-2 bg-rose-500 text-white rounded-full shadow-lg hover:scale-110 transition-all"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    ))}
                    
                    <button 
                        onClick={addExpense}
                        className="w-full py-4 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-3xl text-[10px] font-black uppercase tracking-widest text-neutral-400 hover:border-neutral-400 hover:text-neutral-600 transition-all flex items-center justify-center gap-2"
                    >
                        <Plus className="w-4 h-4" /> Añadir otro gasto
                    </button>
                </div>

                <div className="pt-8 border-t border-neutral-100 dark:border-neutral-800 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="text-center md:text-left">
                        <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest">Balance de Justificación</p>
                        <p className={`text-xl font-black italic tracking-tighter ${Math.abs(difference) < 0.01 ? 'text-emerald-500' : 'text-amber-500'}`}>
                            {difference === 0 ? '¡Cuadrado Exacto!' : difference > 0 ? `Restan $${difference.toFixed(2)} por asignar` : `Exceso de $${Math.abs(difference).toFixed(2)}`}
                        </p>
                    </div>
                    <div className="flex gap-4 w-full md:w-auto">
                        <button onClick={onClose} className="flex-1 md:flex-none px-8 py-4 text-[10px] font-black uppercase tracking-widest text-neutral-500 hover:text-black transition-all">
                            Cancelar
                        </button>
                        <button 
                            disabled={isSaving || expenses.some((e:any) => !e.monto || !e.concepto)}
                            onClick={onSave}
                            className="flex-1 md:flex-none px-10 py-4 bg-neutral-900 dark:bg-white text-white dark:text-black rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all flex items-center justify-center gap-2"
                        >
                            {isSaving ? (
                                <div className="w-4 h-4 border-2 border-white dark:border-black border-t-transparent rounded-full animate-spin"></div>
                            ) : (
                                <Save className="w-4 h-4" />
                            )}
                            Guardar Cambios
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

function EgresosExplorerTab({ 
    movimientos, 
    subcategoriasMap, 
    subcategorias, 
    selectedMonth, 
    selectedYear, 
    setSelectedMonth, 
    setSelectedYear 
}: any) {
    const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
    const [expandedSubcategory, setExpandedSubcategory] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    // 1. Filtrar Movimientos del Mes
    const egresosDelMes = useMemo(() => {
        return movimientos.filter((m: any) => {
            if (m.tipo !== 'egreso' || m.es_traslado) return false;
            const d = new Date(m.created_at);
            return d.getMonth() === selectedMonth && d.getFullYear() === selectedYear;
        });
    }, [movimientos, selectedMonth, selectedYear]);

    // 2. Agrupar por Categoría -> Subcategoría
    const groupedData = useMemo(() => {
        const groups: Record<string, { total: number, subcategorias: Record<string, { total: number, movimientos: any[] }> }> = {};
        
        let filteredEgresos = egresosDelMes;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            filteredEgresos = filteredEgresos.filter((m:any) => 
                (m.concepto || '').toLowerCase().includes(q) || 
                (m.categoria || '').toLowerCase().includes(q) ||
                (subcategoriasMap.get(m.subcategoria_id) || '').toLowerCase().includes(q)
            );
        }

        filteredEgresos.forEach((m: any) => {
            const cat = m.categoria || "Sin Categoría";
            const sub = subcategoriasMap.get(m.subcategoria_id) || "General";
            const monto = Number(m.monto);

            if (!groups[cat]) groups[cat] = { total: 0, subcategorias: {} };
            groups[cat].total += monto;

            if (!groups[cat].subcategorias[sub]) groups[cat].subcategorias[sub] = { total: 0, movimientos: [] };
            groups[cat].subcategorias[sub].total += monto;
            groups[cat].subcategorias[sub].movimientos.push(m);
        });

        // Convertir a arrays para fácil mapeo
        const sortedCategories = Object.entries(groups)
            .map(([name, data]) => ({
                name,
                total: data.total,
                subcategorias: Object.entries(data.subcategorias)
                    .map(([subName, subData]) => ({
                        name: subName,
                        total: subData.total,
                        movimientos: subData.movimientos.sort((a:any,b:any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    }))
                    .sort((a, b) => b.total - a.total)
            }))
            .sort((a, b) => b.total - a.total);

        return sortedCategories;
    }, [egresosDelMes, subcategoriasMap, searchQuery]);

    const totalEgresosMes = groupedData.reduce((acc, cat) => acc + cat.total, 0);

    return (
        <div className="space-y-8 animate-in fade-in">
            {/* Header / Selector de Mes */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6 bg-white dark:bg-neutral-900 p-8 rounded-[3rem] shadow-xl border border-neutral-100 dark:border-neutral-800">
                <div>
                    <h2 className="text-3xl font-black italic uppercase tracking-tighter">Auditoría de Egresos</h2>
                    <p className="text-neutral-400 text-sm mt-1">Análisis profundo de gastos y salidas de dinero.</p>
                </div>
                
                <div className="flex flex-col sm:flex-row items-center gap-6 w-full lg:w-auto">
                    <div className="relative w-full sm:w-auto">
                        <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400" />
                        <input 
                            type="text" 
                            placeholder="Buscar concepto..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            className="pl-11 pr-4 py-3 bg-neutral-100 dark:bg-neutral-800 border-none rounded-2xl text-sm font-bold w-full sm:w-64 focus:ring-2 focus:ring-black dark:focus:ring-white outline-none"
                        />
                    </div>
                    
                    {/* Month/Year Selector from Dashboard */}
                    <div className="flex items-center justify-between w-full sm:w-auto gap-4 bg-neutral-100 dark:bg-neutral-800 p-2 rounded-3xl border border-neutral-200 dark:border-neutral-700">
                        <button 
                            onClick={() => {
                                if (selectedMonth === 0) {
                                    setSelectedMonth(11);
                                    setSelectedYear(selectedYear - 1);
                                } else {
                                    setSelectedMonth(selectedMonth - 1);
                                }
                            }}
                            className="p-3 rounded-2xl bg-white dark:bg-neutral-900 shadow-sm hover:scale-105 transition-transform"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <div className="text-center min-w-[120px]">
                            <p className="text-sm font-black uppercase italic tracking-tighter text-neutral-900 dark:text-white">
                                {new Date(selectedYear, selectedMonth).toLocaleDateString('es-ES', { month: 'long' })}
                            </p>
                            <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">{selectedYear}</p>
                        </div>
                        <button 
                            onClick={() => {
                                if (selectedMonth === 11) {
                                    setSelectedMonth(0);
                                    setSelectedYear(selectedYear + 1);
                                } else {
                                    setSelectedMonth(selectedMonth + 1);
                                }
                            }}
                            className="p-3 rounded-2xl bg-white dark:bg-neutral-900 shadow-sm hover:scale-105 transition-transform"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>


            {/* Hierarchical Table */}
            <div className="bg-white dark:bg-neutral-900 rounded-[3rem] shadow-2xl border border-neutral-100 dark:border-neutral-800 overflow-hidden">
                <div className="p-8 border-b border-neutral-100 dark:border-neutral-800 flex justify-between items-center bg-neutral-50 dark:bg-neutral-800/50">
                    <p className="text-xs font-black text-neutral-400 uppercase tracking-widest">Total del Mes</p>
                    <h3 className="text-3xl font-black text-rose-500 italic tracking-tighter">${totalEgresosMes.toFixed(2)}</h3>
                </div>

                <div className="p-4 sm:p-8">
                    {groupedData.length === 0 ? (
                        <div className="text-center py-20 text-neutral-400 italic">No se encontraron egresos para este mes.</div>
                    ) : (
                        <div className="space-y-4">
                            {groupedData.map((cat, i) => {
                                const isCatExpanded = expandedCategory === cat.name;
                                const percentage = totalEgresosMes > 0 ? (cat.total / totalEgresosMes) * 100 : 0;
                                
                                return (
                                    <div key={i} className="rounded-3xl border border-neutral-100 dark:border-neutral-800 overflow-hidden transition-all duration-300 bg-white dark:bg-neutral-900">
                                        {/* Categoria Row */}
                                        <div 
                                            onClick={() => setExpandedCategory(isCatExpanded ? null : cat.name)}
                                            className={`p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors ${isCatExpanded ? 'bg-neutral-50 dark:bg-neutral-800/50 border-b border-neutral-100 dark:border-neutral-800' : ''}`}
                                        >
                                            <div className="flex-1 w-full sm:w-auto">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <div className={`transition-transform duration-300 ${isCatExpanded ? 'rotate-90 text-blue-500' : 'text-neutral-400'}`}>
                                                        <ChevronRight className="w-5 h-5" />
                                                    </div>
                                                    <h4 className="text-lg font-black uppercase tracking-tighter">{cat.name}</h4>
                                                    <span className="text-[10px] font-black px-2 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-neutral-500">{cat.subcategorias.length} Subcats</span>
                                                </div>
                                                <div className="w-full bg-neutral-100 dark:bg-neutral-800 h-1.5 rounded-full overflow-hidden mt-3 max-w-md">
                                                    <div className="bg-rose-500 h-full rounded-full transition-all duration-1000" style={{ width: `${percentage}%` }}></div>
                                                </div>
                                                <p className="text-[10px] text-neutral-400 font-bold mt-1">{percentage.toFixed(1)}% del total mensual</p>
                                            </div>
                                            <div className="mt-4 sm:mt-0 text-left sm:text-right">
                                                <p className="text-2xl font-black italic text-rose-500 tracking-tighter">${cat.total.toFixed(2)}</p>
                                            </div>
                                        </div>

                                        {/* Subcategorias Area */}
                                        {isCatExpanded && (
                                            <div className="bg-neutral-50/50 dark:bg-neutral-900/50 p-4 sm:p-6 space-y-3">
                                                {cat.subcategorias.map((sub, j) => {
                                                    const subKey = `${cat.name}-${sub.name}`;
                                                    const isSubExpanded = expandedSubcategory === subKey;
                                                    const subPercentage = (sub.total / cat.total) * 100;

                                                    return (
                                                        <div key={j} className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800 overflow-hidden shadow-sm">
                                                            <div 
                                                                onClick={() => setExpandedSubcategory(isSubExpanded ? null : subKey)}
                                                                className="p-4 flex justify-between items-center cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-colors"
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className={`transition-transform duration-300 ${isSubExpanded ? 'rotate-90 text-blue-500' : 'text-neutral-400'}`}>
                                                                        <ChevronRight className="w-4 h-4" />
                                                                    </div>
                                                                    <div>
                                                                        <h5 className="text-sm font-bold uppercase">{sub.name}</h5>
                                                                        <p className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">{subPercentage.toFixed(0)}% de {cat.name}</p>
                                                                    </div>
                                                                </div>
                                                                <div className="flex items-center gap-4">
                                                                    <span className="text-[10px] font-black bg-neutral-100 dark:bg-neutral-900 px-2 py-1 rounded text-neutral-500">{sub.movimientos.length} movs</span>
                                                                    <p className="text-lg font-black italic tracking-tighter text-rose-500">${sub.total.toFixed(2)}</p>
                                                                </div>
                                                            </div>

                                                            {/* Movimientos List */}
                                                            {isSubExpanded && (
                                                                <div className="border-t border-neutral-100 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-900 p-4">
                                                                    <div className="space-y-2">
                                                                        {sub.movimientos.map((m, k) => (
                                                                            <div key={k} className="flex justify-between items-center p-3 bg-white dark:bg-neutral-800 rounded-xl shadow-sm border border-neutral-100 dark:border-neutral-700 hover:border-blue-500 transition-colors group">
                                                                                <div className="flex flex-col">
                                                                                    <span className="text-xs font-bold uppercase text-neutral-800 dark:text-neutral-200">{m.concepto || 'Sin Concepto'}</span>
                                                                                    <div className="flex items-center gap-2 mt-1">
                                                                                        <span className="text-[9px] font-black text-neutral-400 uppercase tracking-widest">{new Date(m.created_at).toLocaleDateString()} {new Date(m.created_at).toLocaleTimeString()}</span>
                                                                                        <span className="text-[8px] px-1.5 py-0.5 bg-neutral-200 dark:bg-neutral-700 rounded uppercase font-bold text-neutral-500">{m.metodo_pago}</span>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="text-right">
                                                                                    <span className="text-sm font-black italic text-rose-500 tracking-tighter">${Number(m.monto).toFixed(2)}</span>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

