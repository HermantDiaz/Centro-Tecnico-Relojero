import Link from "next/link";

export default function Reparaciones() {
  return (
    <div className="max-w-7xl mx-auto space-y-8">
      <section>
        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white mb-2">🛠️ Reparaciones</h1>
        <p className="text-neutral-500 font-medium">Control de taller y entregas técnicas.</p>
      </section>
      
      <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl">
        <p className="text-neutral-400 italic mb-4">Módulo en construcción...</p>
        <Link href="/" className="px-6 py-2 bg-neutral-900 dark:bg-white text-white dark:text-black rounded-xl font-bold">Volver al Dashboard</Link>
      </div>
    </div>
  );
}
