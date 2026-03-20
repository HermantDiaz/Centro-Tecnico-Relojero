export default function Reparaciones() {
  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="bg-white dark:bg-neutral-900 rounded-[2.5rem] p-12 border border-neutral-100 dark:border-neutral-800 text-center shadow-2xl">
        <span className="text-6xl mb-6 block grayscale opacity-50 italic">🛠️</span>
        <h1 className="text-3xl font-black text-neutral-900 dark:text-white mb-4 tracking-tight uppercase italic">Módulo de Reparaciones</h1>
        <p className="text-neutral-500 dark:text-neutral-400 max-w-md mx-auto font-medium">
          Estamos preparando el sistema para el registro de servicios técnicos, garantías y seguimientos. Próximamente disponible.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <div className="w-12 h-1 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
             <div className="w-1/3 h-full bg-black dark:bg-white animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
