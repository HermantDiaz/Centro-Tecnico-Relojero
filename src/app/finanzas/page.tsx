"use client";

import { useAuth } from "@/components/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Finanzas() {
  const { rol, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && rol !== 'admin') {
      router.push("/");
    }
  }, [rol, loading, router]);

  if (loading || rol !== 'admin') {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-4 border-neutral-200 dark:border-neutral-800 border-t-black dark:border-t-white rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700 text-left">
      <div className="bg-white dark:bg-neutral-900 rounded-[2.5rem] p-12 border border-neutral-100 dark:border-neutral-800 text-center shadow-2xl">
        <span className="text-6xl mb-6 block grayscale opacity-50 italic">💰</span>
        <h1 className="text-3xl font-black text-neutral-900 dark:text-white mb-4 tracking-tight uppercase italic">Cajas y Finanzas</h1>
        <p className="text-neutral-500 dark:text-neutral-400 max-w-md mx-auto font-medium">
          Módulo de control de ingresos, gastos y flujo de caja diario. Próximamente disponible.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <div className="w-12 h-1 bg-neutral-100 dark:bg-neutral-800 rounded-full overflow-hidden">
             <div className="w-2/3 h-full bg-black dark:bg-white animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
