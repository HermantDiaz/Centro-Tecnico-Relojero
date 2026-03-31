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
    reparacionesAtrasadas: 0,
    reparacionesProximas: 0
  });
  const [actividad, setActividad] = useState<any[]>([]);
  const [reparacionesRecientes, setReparacionesRecientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Solo cargamos cuando el usuario esté presente Y la sesión esté totalmente lista
    if (user && sessionReady) {
      fetchDashboardData();
    }
  }, [user, sessionReady, lastFocusAt]); // Sincronizado con el Pulso de Vida (v8.4)

  async function fetchDashboardData(retries = 5) {
    if (!user) return;
    setLoading(true);
    try {
      // 1. Stock Bajo

      // 1. Stock Bajo
      const { data: invAll, error: err1 } = await supabase
        .from("inventario")
        .select("stock_actual, stock_minimo");
      
      if (err1) throw err1;
      const stockBajoCount = invAll?.filter(p => p.stock_minimo !== -1 && p.stock_actual <= p.stock_minimo).length || 0;
      
      // 2. Valuacion
      const { data: invData, error: err2 } = await supabase
        .from("inventario")
        .select("precio_compra, stock_actual");
      
      if (err2) throw err2;
      const totalValuacion = invData?.reduce((acc: number, curr: any) => 
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
        .select("id, estado, fecha_compromiso, marca, modelo_descripcion, clientes:cliente_id(nombre_completo)")
        .neq("estado", "entregado")
        .order("created_at", { ascending: false });

      if (err4) throw err4;

      const now = new Date();
      const atrasadas = repData?.filter(r => r.fecha_compromiso && new Date(r.fecha_compromiso) < now).length || 0;
      const proximas = repData?.filter(r => {
        if (!r.fecha_compromiso) return false;
        const diff = new Date(r.fecha_compromiso).getTime() - now.getTime();
        const days = diff / (1000 * 60 * 60 * 24);
        return days >= 0 && days <= 2;
      }).length || 0;

      setStats({
        stockBajo: stockBajoCount,
        valuacion: totalValuacion,
        reparacionesActivas: repData?.length || 0,
        reparacionesAtrasadas: atrasadas,
        reparacionesProximas: proximas,
        ingresosMes: 0,
        flujoCaja: 0
      });
  
      if (recents) setActividad(recents);
      if (repData) setReparacionesRecientes(repData.slice(0, 5));
    } catch (error: any) {
      const isLockError = error.message?.includes("Lock broken") || error.name === 'AbortError';
      if (retries > 0 && (isLockError || error.code === 'PGRST301' || error.message?.includes("JWT"))) {
        console.warn("Dashboard: Re-sync detectado, reintentando...", retries);
        await new Promise(r => setTimeout(r, 600));
        return fetchDashboardData(retries - 1);
      }
      console.error("Dashboard error:", error);
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
            Resumen operativo y financiero de hoy en CTR Relojeria.
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
            onClick={() => alert("Módulo de Finanzas: El registro de ingresos estará disponible próximamente. 💰")}
            className="whitespace-nowrap px-4 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-800 text-neutral-900 dark:text-white rounded-xl font-bold text-xs md:text-sm hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-all shadow-sm min-w-max"
          >
            💰 Registrar Ingreso
          </button>
          <button 
            onClick={() => alert("Módulo de Finanzas: El registro de gastos estará disponible próximamente. 📈")}
            className="whitespace-nowrap px-4 py-2.5 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-400 rounded-xl font-bold text-xs md:text-sm hover:bg-red-100 dark:hover:bg-red-900/50 transition-all shadow-sm min-w-max"
          >
            📉 Registrar Gasto
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
                <p className="text-2xl font-black text-neutral-900 dark:text-white">$0.00</p>
                <div className="mt-2 text-xs text-neutral-500 italic">Efectivo total disponible</div>
              </div>
            )}

            {/* Ingresos del Mes (Solo Admin) */}
            {rol === 'admin' && (
              <div className="p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm">
                <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">Ingresos Mes</p>
                <p className="text-2xl font-black text-neutral-900 dark:text-white">$0.00</p>
                <div className="mt-2 text-xs text-green-500 font-medium">↑ 0% vs mes pasado</div>
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
              <div className="p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm">
                <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">Total Deudas</p>
                <p className="text-2xl font-black text-neutral-900 dark:text-white">$0.00</p>
                <div className="mt-2 text-xs text-amber-500 font-medium">Por cobrar y pagar</div>
              </div>
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
                    <p className="text-xs font-black text-neutral-400 uppercase mb-3 tracking-widest">Ingresos Recientes</p>
                    <div className="space-y-3">
                      <p className="text-sm text-neutral-500 italic">No se han registrado ingresos hoy</p>
                    </div>
                  </div>

                  {/* Top Egresos */}
                  <div>
                    <p className="text-xs font-black text-neutral-400 uppercase mb-3 tracking-widest">Egresos recurrentes</p>
                    <div className="space-y-3">
                      <p className="text-sm text-neutral-500 italic">No se han registrado gastos hoy</p>
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
