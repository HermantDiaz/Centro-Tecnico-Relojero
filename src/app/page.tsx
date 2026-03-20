"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

export default function Dashboard() {
  const [stats, setStats] = useState({
    stockBajo: 0,
    valuacion: 0,
    reparacionesActivas: 0,
    ingresosMes: 0,
    flujoCaja: 0
  });
  const [actividad, setActividad] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    setLoading(true);
    
    // 1. Stock Bajo
    const { data: stockBajoData } = await supabase
      .from("inventario")
      .select("id")
      .lte("stock_actual", "stock_minimo");
    
    // 2. Valuación (Suma de precio_compra * stock)
    const { data: invData } = await supabase
      .from("inventario")
      .select("precio_compra, stock_actual");
    
    const totalValuacion = invData?.reduce((acc: number, curr: { precio_compra: number; stock_actual: number }) => 
      acc + (curr.precio_compra * curr.stock_actual), 0) || 0;

    // 3. Actividad Reciente (Últimos 3 productos)
    const { data: recents } = await supabase
      .from("inventario")
      .select("nombre, created_at")
      .order("created_at", { ascending: false })
      .limit(3);

    setStats(prev => ({
      ...prev,
      stockBajo: stockBajoData?.length || 0,
      valuacion: totalValuacion
    }));

    if (recents) setActividad(recents);
    setLoading(false);
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Bienvenida y Acciones Críticas */}
      <section className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2 tracking-tight">
            Bienvenido, Herman 👋
          </h1>
          <p className="text-neutral-500 dark:text-neutral-400 font-medium">
            Resumen operativo y financiero de hoy en CTR Relojería.
          </p>
        </div>
        <div className="flex flex-row gap-2 md:gap-4 shrink-0 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
          <button className="whitespace-nowrap px-4 py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-black rounded-xl font-bold text-xs md:text-sm hover:scale-105 transition-all shadow-lg min-w-max">
            ✨ Nueva Reparación
          </button>
          <button className="whitespace-nowrap px-4 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white rounded-xl font-bold text-xs md:text-sm hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-all shadow-sm min-w-max">
            💰 Registrar Ingreso
          </button>
          <button className="whitespace-nowrap px-4 py-2.5 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-400 rounded-xl font-bold text-xs md:text-sm hover:bg-red-100 dark:hover:bg-red-900/50 transition-all shadow-sm min-w-max">
            📉 Registrar Gasto
          </button>
        </div>
      </section>

      {/* Tarjetas de Resumen (Stats Profesionales) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {/* Valuación de Inventario (Reemplaza Flujo de Caja temporalmente hasta tener módulo de finanzas) */}
        <div className="p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm">
          <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">Valuación Inventario</p>
          <p className="text-2xl font-black text-neutral-900 dark:text-white">
            ${stats.valuacion.toLocaleString()}
          </p>
          <div className="mt-2 text-xs text-neutral-500 italic">Costo total en mercancía</div>
        </div>

        {/* Ingresos del Mes */}
        <div className="p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm">
          <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">Ingresos Mes</p>
          <p className="text-2xl font-black text-neutral-900 dark:text-white">$0.00</p>
          <div className="mt-2 text-xs text-green-500 font-medium">↑ 0% vs mes pasado</div>
        </div>
        
        {/* Reparaciones Activas / Alertas */}
        <div className="p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm">
          <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">Taller (Activas)</p>
          <p className="text-2xl font-black text-neutral-900 dark:text-white">0</p>
          <div className="mt-2 flex gap-2">
            <span className="text-xs text-red-500 font-bold">0 Atrasadas</span>
            <span className="text-xs text-amber-500 font-bold">0 Por vencer</span>
          </div>
        </div>

        {/* Alertas de Stock (Real) */}
        <div className="p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm">
          <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">Stock Bajo</p>
          <p className={`text-2xl font-black ${stats.stockBajo > 0 ? 'text-red-500' : 'text-neutral-900 dark:text-white'}`}>
            {stats.stockBajo}
          </p>
          <div className="mt-2 text-xs text-neutral-500 italic">Productos en alerta</div>
        </div>

        {/* Deudas Totales */}
        <div className="p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm">
          <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">Total Deudas</p>
          <p className="text-2xl font-black text-neutral-900 dark:text-white">$0.00</p>
          <div className="mt-2 text-xs text-amber-500 font-medium">Por cobrar y pagar</div>
        </div>
      </div>

      {/* Secciones de Detalle */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Reparaciones Recientes (Foco Operativo) */}
        <div className="lg:col-span-8 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Reparaciones en Taller</h2>
            <button className="text-sm font-semibold text-neutral-500 hover:text-black dark:hover:text-white transition-all">Ver todas</button>
          </div>
          <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-neutral-100 dark:border-neutral-800 rounded-2xl bg-neutral-50/50 dark:bg-black/50">
             <span className="text-4xl mb-3 opacity-50">⌚</span>
             <p className="text-neutral-400 text-sm font-medium italic">No hay reparaciones pendientes</p>
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
          🕒 Actividad Reciente del Sistema
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
    </div>
  );
}
