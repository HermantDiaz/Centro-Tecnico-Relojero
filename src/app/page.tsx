export default function Dashboard() {
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
        <div className="flex flex-wrap gap-3">
          <button className="px-4 py-2.5 bg-neutral-900 dark:bg-white text-white dark:text-black rounded-xl font-bold text-sm hover:scale-105 transition-all shadow-lg">
            ✨ Nueva Reparación
          </button>
          <button className="px-4 py-2.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-900 dark:text-white rounded-xl font-bold text-sm hover:bg-neutral-50 dark:hover:bg-neutral-700 transition-all shadow-sm">
            💰 Registrar Ingreso
          </button>
          <button className="px-4 py-2.5 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 text-red-600 dark:text-red-400 rounded-xl font-bold text-sm hover:bg-red-100 dark:hover:bg-red-900/50 transition-all shadow-sm">
            📉 Registrar Gasto
          </button>
        </div>
      </section>

      {/* Tarjetas de Resumen (Stats Profesionales) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {/* Flujo de Caja */}
        <div className="p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm">
          <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">Flujo de Caja</p>
          <p className="text-2xl font-black text-neutral-900 dark:text-white">$0.00</p>
          <div className="mt-2 text-xs text-neutral-500 italic">Efectivo total disponible</div>
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

        {/* Alertas de Stock */}
        <div className="p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm">
          <p className="text-xs font-bold text-neutral-500 dark:text-neutral-400 uppercase tracking-wider mb-2">Stock Bajo</p>
          <p className="text-2xl font-black text-neutral-900 dark:text-white">0</p>
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

          {/* Acciones Rápidas Complementarias */}
          <div className="bg-neutral-900 dark:bg-neutral-800 p-6 rounded-2xl shadow-xl">
             <h3 className="text-sm font-bold text-neutral-400 dark:text-neutral-500 mb-4 uppercase tracking-widest">Gestión de Inventario</h3>
             <div className="grid grid-cols-1 gap-2">
                <button className="w-full text-left py-2 text-white dark:text-white font-bold hover:translate-x-1 transition-transform">➕ Stock de Relojes</button>
                <button className="w-full text-left py-2 text-white dark:text-white font-bold hover:translate-x-1 transition-transform">🔧 Stock de Repuestos</button>
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
