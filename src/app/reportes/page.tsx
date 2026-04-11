"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/components/AuthProvider";
import { supabase } from "@/lib/supabase";
import { PieChart, TrendingUp, History, CalendarDays, Building2, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";

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

interface Movimiento {
    tipo: 'ingreso' | 'egreso';
    monto: number;
    es_traslado: boolean;
    created_at: string;
    concepto?: string;
}

export default function ReportesPage() {
  const { rol, user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [sesiones, setSesiones] = useState<CajaSesion[]>([]);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  
  // Balance General States
  const [saldosCobrar, setSaldosCobrar] = useState(0);
  const [capitalDisponible, setCapitalDisponible] = useState(0);
  const [deudasTotales, setDeudasTotales] = useState(0);
  
  const [fetching, setFetching] = useState(true);

  // Chart States
  const [timeFilter, setTimeFilter] = useState<'7d' | '30d' | '12m' | 'all'>('7d');
  const [hoverData, setHoverData] = useState<{label: string, ingreso: number, egreso: number} | null>(null);

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

                // 2. Fetch Movimientos para el P&L Global
                const { data: movs, error: movsError } = await supabase
                    .from('caja_movimientos')
                    .select('tipo, monto, es_traslado, created_at, concepto')
                    .order('created_at', { ascending: true });
                
                if (movsError) console.error("Error fetching movs:", movsError);
                if (movs) setMovimientos(movs as any);

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
            } catch (e) {
                console.error(e);
            } finally {
                setFetching(false);
            }
        };

        fetchReportes();
    }
  }, [user, rol]);

  const globalStats = useMemo(() => {
      const statsIngresos = new Map<string, number>();
      const statsEgresos = new Map<string, number>();
      let ingresos = 0;
      let egresos = 0;

      movimientos.forEach(m => {
          if (m.es_traslado) return;
          if (m.tipo === 'ingreso') {
              ingresos += Number(m.monto);
              if (m.concepto) statsIngresos.set(m.concepto, (statsIngresos.get(m.concepto) || 0) + Number(m.monto));
          } else if (m.tipo === 'egreso') {
              egresos += Number(m.monto);
              if (m.concepto) statsEgresos.set(m.concepto, (statsEgresos.get(m.concepto) || 0) + Number(m.monto));
          }
      });

      const descOrder = (a: any, b: any) => b.monto - a.monto;
      const topIngresos = Array.from(statsIngresos, ([concepto, monto]) => ({ concepto, monto })).sort(descOrder).slice(0, 5);
      const topEgresos = Array.from(statsEgresos, ([concepto, monto]) => ({ concepto, monto })).sort(descOrder).slice(0, 5);

      return { ingresos, egresos, margen: ingresos - egresos, topIngresos, topEgresos };
  }, [movimientos]);

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
    movimientos.forEach(m => {
        if (m.es_traslado) return;
        const md = new Date(m.created_at);
        let key = '';
        
        if (timeFilter === '7d') {
            key = md.toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' });
        } else if (timeFilter === '30d') {
            key = md.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
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
  }, [movimientos, timeFilter]);

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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 relative z-10 w-full mb-8">
          <div className="bg-white dark:bg-neutral-900 rounded-[3rem] border border-neutral-100 dark:border-neutral-800 p-8 shadow-2xl">
              <h4 className="text-xl font-black text-neutral-900 dark:text-white uppercase tracking-tighter italic mb-1">Top Ingresos</h4>
              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-6">Conceptos más rentables (Histórico)</p>
              <div className="space-y-4">
                  {globalStats.topIngresos.map((ing, i) => (
                      <div key={i} className="flex justify-between items-center bg-emerald-50/50 dark:bg-emerald-900/10 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/30">
                          <span className="font-bold text-sm text-neutral-700 dark:text-neutral-300 truncate pr-4">{ing.concepto}</span>
                          <span className="font-black text-emerald-600 dark:text-emerald-400 shrink-0">${ing.monto.toFixed(2)}</span>
                      </div>
                  ))}
                  {globalStats.topIngresos.length === 0 && (
                      <div className="text-center py-8 text-neutral-400 italic text-sm font-medium">No hay datos suficientes.</div>
                  )}
              </div>
          </div>
          
          <div className="bg-white dark:bg-neutral-900 rounded-[3rem] border border-neutral-100 dark:border-neutral-800 p-8 shadow-2xl">
              <h4 className="text-xl font-black text-neutral-900 dark:text-white uppercase tracking-tighter italic mb-1">Top Gastos</h4>
              <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mb-6">Desglose de mayores egresos (Histórico)</p>
              <div className="space-y-4">
                  {globalStats.topEgresos.map((egr, i) => (
                      <div key={i} className="flex justify-between items-center bg-rose-50/50 dark:bg-rose-900/10 p-4 rounded-2xl border border-rose-100 dark:border-rose-900/30">
                          <span className="font-bold text-sm text-neutral-700 dark:text-neutral-300 truncate pr-4">{egr.concepto}</span>
                          <span className="font-black text-rose-600 dark:text-rose-400 shrink-0">${egr.monto.toFixed(2)}</span>
                      </div>
                  ))}
                  {globalStats.topEgresos.length === 0 && (
                      <div className="text-center py-8 text-neutral-400 italic text-sm font-medium">No hay datos suficientes.</div>
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
              <div className="flex bg-neutral-100 dark:bg-neutral-800 rounded-full p-1 w-full md:w-auto">
                  {['7d', '30d', '12m', 'all'].map(tf => (
                      <button 
                        key={tf}
                        onClick={() => setTimeFilter(tf as any)}
                        className={`flex-1 md:flex-none px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer ${timeFilter === tf ? 'bg-white dark:bg-neutral-900 text-black dark:text-white shadow-xl scale-105 z-10' : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'}`}
                      >
                          {tf === '7d' ? '7 Días' : tf === '30d' ? '30 Días' : tf === '12m' ? '1 Año' : 'Histórico'}
                      </button>
                  ))}
              </div>
          </div>

          {/* The Bars Area Wrapper for horizontal scrolling */}
          <div className="overflow-x-auto custom-scrollbar pb-10 pt-4 -mx-4 px-4 md:mx-0 md:px-0">
              <div className="relative h-72 sm:h-80 flex items-end justify-start md:justify-center gap-2 sm:gap-4 lg:gap-8 min-w-max md:min-w-0">
                  {/* Background Grid Lines optional, but let's keep it minimalist without them */}
                  
                  {chartData.map((data, i) => (
                      <div key={i} className="relative flex-1 group flex flex-col justify-end h-full mt-auto cursor-pointer min-w-[36px] sm:min-w-[48px] max-w-16 md:max-w-32"
                           onMouseEnter={() => setHoverData(data)}
                           onMouseLeave={() => setHoverData(null)}
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
          <div className="flex items-center gap-3 mb-6 px-4">
              <History className="w-8 h-8 text-neutral-900 dark:text-white" />
              <div>
                  <h3 className="text-2xl font-black text-neutral-900 dark:text-white uppercase italic tracking-tighter">Historial de Turnos (Cortes de Caja)</h3>
                  <p className="text-[10px] font-black text-neutral-400 uppercase tracking-widest mt-1">Auditoría patrimonial retroactiva</p>
              </div>
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
                          </tr>
                      ))}
                      {sesiones.length === 0 && (
                          <tr>
                              <td colSpan={5} className="px-8 py-32 text-center text-neutral-400 italic font-medium">
                                  No hay turnos registrados en el sistema.
                              </td>
                          </tr>
                      )}
                  </tbody>
              </table>
          </div>
      </div>
    </div>
  );
}
