"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/components/AuthProvider";

interface Perfil {
  id: string;
  nombre: string;
  rol: "admin" | "recepcion" | "tecnico";
  email?: string;
}

export default function GestionUsuarios() {
  const { rol: currentUserRol } = useAuth();
  const [usuarios, setUsuarios] = useState<Perfil[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUsuarios() {
      // Nota: Para obtener el email necesitamos consultar una vista o auth.users via RPC o API Admin
      // Por simplicidad en este MVP, mostraremos solo los perfiles públicos.
      const { data, error } = await supabase
        .from("perfiles")
        .select("*")
        .order("rol", { ascending: true });

      if (!error && data) {
        setUsuarios(data);
      }
      setLoading(false);
    }

    if (currentUserRol === "admin") {
      fetchUsuarios();
    }
  }, [currentUserRol]);

  if (currentUserRol !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center p-10 bg-white dark:bg-neutral-900 rounded-[2.5rem] shadow-2xl border border-red-50 dark:border-red-900/20 max-w-sm">
          <span className="text-4xl mb-4 block">🚫</span>
          <h2 className="text-lg font-black text-neutral-900 dark:text-white uppercase tracking-tight">Acceso Denegado</h2>
          <p className="text-xs text-neutral-500 mt-2 font-medium">Solo administradores pueden gestionar el equipo.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-black text-neutral-900 dark:text-white tracking-tight uppercase italic">Gestión de Equipo</h1>
          <p className="text-neutral-500 dark:text-neutral-400 font-medium">Administración de roles y accesos CTR</p>
        </div>
        <button className="px-6 py-3 bg-black dark:bg-white text-white dark:text-black rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl">
          + Invitar Miembro
        </button>
      </div>

      <div className="bg-white dark:bg-neutral-900 rounded-[2.5rem] border border-neutral-100 dark:border-neutral-800 overflow-hidden shadow-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-neutral-50 dark:bg-neutral-800/30 border-b border-neutral-100 dark:border-neutral-800">
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-neutral-400">Usuario</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-neutral-400">Rol Asignado</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-neutral-400">Estado</th>
              <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-neutral-400 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-50 dark:divide-neutral-800/50 text-sm">
            {usuarios.map((user) => (
              <tr key={user.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/10 transition-colors group">
                <td className="px-8 py-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-neutral-900 dark:bg-white rounded-2xl flex items-center justify-center text-white dark:text-black font-black text-xs">
                      {user.nombre?.charAt(0) || "U"}
                    </div>
                    <div>
                      <p className="font-bold text-neutral-900 dark:text-white leading-tight">{user.nombre || "Sin nombre"}</p>
                      <p className="text-[10px] text-neutral-400 font-medium uppercase tracking-tighter">ID: {user.id.substring(0, 8)}...</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6">
                  <span className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                    user.rol === 'admin' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' :
                    user.rol === 'tecnico' ? 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400' :
                    'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                  }`}>
                    {user.rol === 'admin' ? '💎 Admin' : user.rol === 'tecnico' ? '🔧 Técnico' : '🏢 Recepción'}
                  </span>
                </td>
                <td className="px-8 py-6">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-500 uppercase">Activo</span>
                  </div>
                </td>
                <td className="px-8 py-6 text-right">
                  <button className="p-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-all opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-black dark:hover:text-white">
                    ⚙️
                  </button>
                </td>
              </tr>
            ))}
            {usuarios.length === 0 && !loading && (
              <tr>
                <td colSpan={4} className="px-8 py-12 text-center text-neutral-400 italic font-medium">
                  No hay otros miembros registrados en el equipo.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
