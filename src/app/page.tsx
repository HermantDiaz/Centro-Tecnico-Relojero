export default function Dashboard() {
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Bienvenida */}
      <section>
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">
          Bienvenido, Herman 👋
        </h1>
        <p className="text-neutral-500 dark:text-neutral-400">
          Aquí tienes un resumen de lo que está pasando hoy en tu relojería.
        </p>
      </section>

      {/* Tarjetas de Resumen (Stats) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm">
          <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-2">Ingresos del Mes</p>
          <p className="text-2xl font-bold text-neutral-900 dark:text-white">$0.00</p>
          <div className="mt-2 text-xs text-green-500 font-medium">↑ 0% vs mes pasado</div>
        </div>
        
        <div className="p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm">
          <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-2">Reparaciones Activas</p>
          <p className="text-2xl font-bold text-neutral-900 dark:text-white">0</p>
          <div className="mt-2 text-xs text-blue-500 font-medium">0 listas para entrega</div>
        </div>

        <div className="p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm">
          <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-2">Alertas de Stock</p>
          <p className="text-2xl font-bold text-neutral-900 dark:text-white">0</p>
          <div className="mt-2 text-xs text-red-500 font-medium italic">Todo en orden</div>
        </div>

        <div className="p-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-sm">
          <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400 mb-2">Total Deudas</p>
          <p className="text-2xl font-bold text-neutral-900 dark:text-white">$0.00</p>
          <div className="mt-2 text-xs text-amber-500 font-medium">Por cobrar / Pagar</div>
        </div>
      </div>

      {/* Secciones rápidas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Reparaciones Recientes */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Reparaciones Recientes</h2>
            <button className="text-sm font-semibold text-black dark:text-white underline">Ver todas</button>
          </div>
          <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-neutral-100 dark:border-neutral-800 rounded-xl">
             <span className="text-3xl mb-2">⌚</span>
             <p className="text-neutral-500 text-sm italic">No hay reparaciones registradas aún</p>
          </div>
        </div>

        {/* Acciones Rápidas */}
        <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 shadow-sm">
          <h2 className="text-lg font-bold text-neutral-900 dark:text-white mb-6">Acciones Rápidas</h2>
          <div className="grid grid-cols-2 gap-4">
             <button className="p-4 bg-neutral-50 dark:bg-neutral-800 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black rounded-xl transition-all text-left font-medium">
               ✨ Nueva Reparación
             </button>
             <button className="p-4 bg-neutral-50 dark:bg-neutral-800 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black rounded-xl transition-all text-left font-medium">
               ➕ Agregar Reloj
             </button>
             <button className="p-4 bg-neutral-50 dark:bg-neutral-800 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black rounded-xl transition-all text-left font-medium">
               📉 Registrar Gasto
             </button>
             <button className="p-4 bg-neutral-50 dark:bg-neutral-800 hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black rounded-xl transition-all text-left font-medium">
               📋 Lista de Cobros
             </button>
          </div>
        </div>
      </div>
    </div>
  );
}
