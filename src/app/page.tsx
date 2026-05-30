"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, CheckCircle2, AlertTriangle, Calendar, Package, ArrowRight, Wrench, Plus } from "lucide-react";

export default function Dashboard() {
  const { user, rol, sessionReady, lastFocusAt } = useAuth();
  const [stats, setStats] = useState({
    stockBajo: 0,
    valuacion: 0,
    reparacionesActivas: 0,
    ingresosMes: 0,
    flujoCaja: 0,
    deudasTotales: 0,
    reparacionesAtrasadas: 0,
    reparacionesProximas: 0
  });
  const [actividad, setActividad] = useState<any[]>([]);
  const [reparacionesRecientes, setReparacionesRecientes] = useState<any[]>([]);
  const [topIngresos, setTopIngresos] = useState<any[]>([]);
  const [topEgresos, setTopEgresos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // v10.8.5: Se utiliza user?.id como dependencia para evitar disparos por refresco de token.
    if (user?.id && sessionReady) {
      fetchDashboardData();
    }
  }, [user?.id, sessionReady]); // Sincronización estable por ID

  async function fetchDashboardData(retries = 5) {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Stock Bajo
      const { data: invAll, error: err1 } = await supabase
        .from("inventario")
        .select("stock_actual, stock_minimo");
      if (err1) throw err1;
      
      const stockBajoCount = (invAll || []).filter(p => 
        (p.stock_minimo ?? -1) !== -1 && 
        (p.stock_actual || 0) <= (p.stock_minimo || 0)
      ).length || 0;
      
      // 2. Valuacion
      const { data: invData, error: err2 } = await supabase
        .from("inventario")
        .select("precio_compra, stock_actual");
      if (err2) throw err2;
      
      const totalValuacion = (invData || []).reduce((acc: number, curr: any) => 
        acc + ((curr.precio_compra || 0) * (curr.stock_actual || 0)), 0) || 0;
  
      // 3. Actividad
      const { data: recents, error: err3 } = await supabase
        .from("inventario")
        .select("nombre, created_at")
        .order("created_at", { ascending: false })
        .limit(3);
      if (err3) throw err3;
  
      // 4. Reparaciones Activas
      const { data: repData, error: err4 } = await supabase
        .from("reparaciones")
        .select("id, estado, fecha_compromiso, marca, modelo_descripcion, problema_cliente, fecha_ingreso, clientes:cliente_id(nombre_completo)")
        .neq("estado", "entregado")
        .order("created_at", { ascending: false });
      if (err4) throw err4;

      const now = new Date();
      const safeRepData = repData || [];
      const atrasadas = safeRepData.filter(r => r.fecha_compromiso && new Date(r.fecha_compromiso) < now).length || 0;
      const proximas = safeRepData.filter(r => {
        if (!r.fecha_compromiso) return false;
        const diff = new Date(r.fecha_compromiso).getTime() - now.getTime();
        const days = diff / (1000 * 60 * 60 * 24);
        return days >= 0 && days <= 2;
      }).length || 0;

      // 5. Flujo de Caja (Tesoreria)
      const { data: cts } = await supabase.from('tesoreria_cuentas').select('saldo');
      const totalCaja = (cts || []).reduce((acc, c) => acc + Number(c.saldo), 0) || 0;

      // 6. Ingresos del Mes y Top Movimientos Hoy
      const hoy = new Date();
      const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString();
      const { data: movs } = await supabase
        .from('caja_movimientos')
        .select('tipo, monto, concepto, es_traslado, created_at')
        .gte('created_at', inicioMes);

      let ingresosMes = 0;
      let ingresosMesPasado = 0; // Opcional, pero para 0% lo dejaremos simulado o calculable

      const movimientosMes = movs || [];
      const statsIngresos = new Map<string, number>();
      const statsEgresos = new Map<string, number>();

      movimientosMes.forEach((m: any) => {
        if (m.es_traslado) return;
        if (m.tipo === 'ingreso') {
          ingresosMes += Number(m.monto);
          statsIngresos.set(m.concepto, (statsIngresos.get(m.concepto) || 0) + Number(m.monto));
        } else if (m.tipo === 'egreso') {
          statsEgresos.set(m.concepto, (statsEgresos.get(m.concepto) || 0) + Number(m.monto));
        }
      });

      // 7. Total Deudas
      const { data: dds } = await supabase.from('deudas_empresa').select('saldo_pendiente').neq('estado', 'Pagado');
      const totalDeudas = (dds || []).reduce((acc, d) => acc + Number(d.saldo_pendiente), 0);

      // Ordenar y tomar el Top 3
      const descOrder = (a: any, b: any) => b.monto - a.monto;
      const tIngresos = Array.from(statsIngresos, ([concepto, monto]) => ({ concepto, monto })).sort(descOrder).slice(0, 3);
      const tEgresos = Array.from(statsEgresos, ([concepto, monto]) => ({ concepto, monto })).sort(descOrder).slice(0, 3);

      setTopIngresos(tIngresos);
      setTopEgresos(tEgresos);

      setStats({
        stockBajo: stockBajoCount,
        valuacion: totalValuacion,
        reparacionesActivas: safeRepData.length,
        reparacionesAtrasadas: atrasadas,
        reparacionesProximas: proximas,
        ingresosMes: ingresosMes,
        flujoCaja: totalCaja,
        deudasTotales: totalDeudas
      });

      if (recents) setActividad(recents);
      setReparacionesRecientes(safeRepData.slice(0, 5));
  
    } catch (error: any) {
      if (retries > 0) {
        console.warn(`🔄 Dashboard (v10.8.18): Reintentando sincronización segura... (${retries})`);
        await new Promise(r => setTimeout(r, 1500));
        return fetchDashboardData(retries - 1);
      }
      console.error("Dashboard Final Critical Error:", error.message || error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Bienvenida y Acciones Críticas */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2 tracking-tight">
            {user ? `Bienvenido, ${user.email?.split('@')[0]}` : 'Bienvenido'}
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 font-medium">
            Resumen operativo y financiero de hoy en Centro Técnico Relojero.
          </p>
        </div>
        <div className="flex flex-row gap-2 md:gap-4 shrink-0 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
          <button 
            onClick={() => router.push('/reparaciones')}
            className="whitespace-nowrap px-4 py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-black rounded-xl font-bold text-xs md:text-sm hover:scale-105 transition-all shadow-lg min-w-max flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Nueva Reparación
          </button>
          <button 
            onClick={() => router.push('/caja')}
            className="whitespace-nowrap px-4 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white rounded-xl font-bold text-xs md:text-sm hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-all shadow-sm min-w-max"
          >
            💰 Abrir Caja Diaria
          </button>
          <button 
            onClick={() => router.push('/reportes')}
            className="whitespace-nowrap px-4 py-2.5 bg-neutral-900 dark:bg-blue-900/30 border border-neutral-800 dark:border-blue-900/50 text-white dark:text-blue-400 rounded-xl font-bold text-xs md:text-sm hover:bg-neutral-800 dark:hover:bg-blue-900/50 transition-all shadow-sm min-w-max"
          >
            📈 Ver Analíticas
          </button>
        </div>
      </section>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-neutral-100 dark:border-neutral-900 border-t-neutral-900 dark:border-t-white rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          {/* Tarjetas de Resumen (Stats Profesionales) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {/* Flujo de Caja (Solo Admin) */}
            {rol === 'admin' && (
              <div className="p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm">
                <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">Flujo de Caja</p>
                <p className="text-2xl font-black text-neutral-900 dark:text-white">${stats.flujoCaja.toFixed(2)}</p>
                <div className="mt-2 text-xs text-neutral-500 italic">Efectivo total disponible</div>
              </div>
            )}

            {/* Ingresos del Mes (Solo Admin) */}
            {rol === 'admin' && (
              <div className="p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm">
                <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">Ingresos Mes</p>
                <p className="text-2xl font-black text-neutral-900 dark:text-white">${stats.ingresosMes.toFixed(2)}</p>
                <div className="mt-2 text-xs text-green-500 font-medium">Acumulado mensual</div>
              </div>
            )}
            
            <Link href="/reparaciones" className="p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm hover:scale-[1.02] transition-all group">
              <div className="flex justify-between items-start mb-2">
                <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Taller (Activas)</p>
                <Wrench className="w-4 h-4 text-neutral-300 group-hover:text-black dark:group-hover:text-white transition-colors" />
              </div>
              <p className="text-2xl font-black text-neutral-900 dark:text-white">{stats.reparacionesActivas}</p>
              <div className="mt-2 flex gap-3">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${stats.reparacionesAtrasadas > 0 ? 'bg-red-50 text-red-600' : 'text-neutral-400'}`}>
                  {stats.reparacionesAtrasadas} Atrasadas
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${stats.reparacionesProximas > 0 ? 'bg-amber-50 text-amber-600' : 'text-neutral-400'}`}>
                  {stats.reparacionesProximas} Proximas
                </span>
              </div>
            </Link>

            {/* Alertas de Stock (Admin y Recepcion) */}
            {rol !== 'tecnico' && (
              <Link 
                href="/inventario"
                className="p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-2">
                  <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider">Stock Bajo</p>
                  <span className="text-xs opacity-0 group-hover:opacity-100 transition-opacity">Ir →</span>
                </div>
                <p className={`text-2xl font-black ${stats.stockBajo > 0 ? 'text-red-500' : 'text-neutral-900 dark:text-white'}`}>
                  {stats.stockBajo}
                </p>
                <div className="mt-2 text-xs text-neutral-500 italic">Productos en alerta</div>
              </Link>
            )}

            {/* Deudas Totales (Solo Admin) */}
            {rol === 'admin' && (
              <Link href="/deudas" className="p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm hover:scale-[1.02] transition-all group block">
                <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">Total Deudas</p>
                <p className="text-2xl font-black text-neutral-900 dark:text-white">${stats.deudasTotales.toFixed(2)}</p>
                <div className="mt-2 text-xs text-amber-500 font-medium">Por cobrar y pagar</div>
              </Link>
            )}
          </div>

          {/* Secciones de Detalle */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Reparaciones Recientes (Foco Operativo) */}
            <div className="lg:col-span-8 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Reparaciones en Curso</h2>
                <Link href="/reparaciones" className="text-sm font-semibold text-neutral-500 hover:text-black dark:hover:text-white transition-all">Ver todas</Link>
              </div>
              <div className="space-y-4">
                {reparacionesRecientes.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-neutral-100 dark:border-neutral-800 rounded-2xl bg-neutral-50/50 dark:bg-black/50">
                    <span className="text-4xl mb-3 opacity-50">#</span>
                    <p className="text-neutral-400 text-sm font-medium italic">No hay reparaciones pendientes</p>
                  </div>
                ) : (
                  reparacionesRecientes.map((rep) => (
                    <div key={rep.id} className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-100 dark:border-neutral-800 group hover:border-black dark:hover:border-white transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-white dark:bg-neutral-900 flex items-center justify-center shadow-sm">
                          <Clock className="w-5 h-5 text-neutral-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-neutral-900 dark:text-white">{rep.marca} {rep.modelo_descripcion || ''}</p>
                          <p className="text-[10px] text-neutral-500 font-medium uppercase tracking-wider">{rep.clientes?.nombre_completo}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                          rep.estado === 'listo' ? 'bg-blue-50 text-blue-600' : 'bg-neutral-100 text-neutral-500'
                        }`}>
                          {rep.estado}
                        </span>
                        <Link href="/reparaciones" className="p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>


            {/* Resumen Financiero Rápido (Top In/Out) */}
            <div className="lg:col-span-4 space-y-8">
              {/* Top Ingresos/Egresos */}
              <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
                <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-6">Resumen Financiero</h2>
                
                <div className="space-y-6">
                  {/* Top Ingresos */}
                  <div>
                    <p className="text-xs font-black text-neutral-400 uppercase mb-3 tracking-widest">Top Ingresos (Mes)</p>
                    <div className="space-y-3">
                      {topIngresos.length === 0 ? (
                        <p className="text-sm text-neutral-500 italic">No hay ingresos registrados este mes</p>
                      ) : (
                        topIngresos.map((ing, i) => (
                          <div key={`ing-${i}`} className="flex justify-between items-center text-sm">
                            <span className="font-bold text-neutral-700 dark:text-neutral-300 truncate pr-2" title={ing.concepto}>{ing.concepto}</span>
                            <span className="font-black text-emerald-600">${ing.monto.toFixed(2)}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Top Egresos */}
                  <div>
                    <p className="text-xs font-black text-neutral-400 uppercase mb-3 tracking-widest">Top Egresos (Mes)</p>
                    <div className="space-y-3">
                      {topEgresos.length === 0 ? (
                        <p className="text-sm text-neutral-500 italic">No hay egresos registrados este mes</p>
                      ) : (
                        topEgresos.map((egr, i) => (
                          <div key={`egr-${i}`} className="flex justify-between items-center text-sm">
                            <span className="font-bold text-neutral-700 dark:text-neutral-300 truncate pr-2" title={egr.concepto}>{egr.concepto}</span>
                            <span className="font-black text-rose-600">${egr.monto.toFixed(2)}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-neutral-900 dark:bg-neutral-800 p-6 rounded-2xl shadow-xl">
                <h3 className="text-sm font-bold text-neutral-400 dark:text-neutral-500 mb-4 uppercase tracking-widest">Gestión de Inventario</h3>
                <div className="grid grid-cols-1 gap-2">
                    <Link href="/inventario" className="w-full text-left py-2 text-white dark:text-white font-bold hover:translate-x-1 transition-transform block">📦 Ver Todo el Stock</Link>
                    <Link href="/inventario" className="w-full text-left py-2 text-white dark:text-white font-bold hover:translate-x-1 transition-transform block">🔧 Gestionar Repuestos</Link>
                    <button className="w-full text-left py-2 text-white dark:text-white font-bold hover:translate-x-1 transition-transform">📋 Lista de Precios</button>
                </div>
              </div>
            </div>
          </div>

          {/* Actividad Reciente del Sistema */}
          <section className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-6 flex items-center gap-2">
              Actividad Reciente del Sistema
            </h2>
            <div className="space-y-4">
              {actividad.length === 0 ? (
                <div className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-100 dark:border-neutral-800">
                  <div className="flex items-center gap-4">
                    <span className="w-2 h-2 rounded-full bg-green-500"></span>
                    <div>
                      <p className="text-sm font-bold text-neutral-900 dark:text-white">Sistema Inicializado</p>
                      <p className="text-xs text-neutral-500">Se completó la configuración base del Dashboard</p>
                    </div>
                  </div>
                  <span className="text-xs font-medium text-neutral-400">Ahora mismo</span>
                </div>
              ) : (
                <>
                  {actividad.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-xl border border-neutral-100 dark:border-neutral-800 animate-in slide-in-from-left duration-300" style={{ animationDelay: `${idx * 100}ms` }}>
                      <div className="flex items-center gap-4">
                        <span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></span>
                        <div>
                          <p className="text-sm font-bold text-neutral-900 dark:text-white">Producto Registrado</p>
                          <p className="text-xs text-neutral-500">Se añadió "<span className="font-bold text-neutral-700 dark:text-neutral-300">{item.nombre}</span>" al inventario</p>
                        </div>
                      </div>
                      <span className="text-xs font-medium text-neutral-400">
                        {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between p-4 bg-neutral-50/50 dark:bg-neutral-800/20 rounded-xl border border-neutral-100/50 dark:border-neutral-800/50">
                    <div className="flex items-center gap-4">
                      <span className="w-2 h-2 rounded-full bg-green-500"></span>
                      <div>
                        <p className="text-sm font-bold text-neutral-900 dark:text-white opacity-60">Sistema Inicializado</p>
                      </div>
                    </div>
                  </div>
                </>
              )}
              
              <div className="flex items-center justify-between p-4 opacity-50">
                <div className="flex items-center gap-4">
                  <span className="w-2 h-2 rounded-full bg-neutral-300"></span>
                  <div>
                    <p className="text-sm font-medium text-neutral-500 italic">No hay más actividad registrada aún</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
