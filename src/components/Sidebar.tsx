"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useAuth } from "./AuthProvider";

const NAV_ITEMS = [
  { label: "Dashboard", icon: "📊", path: "/", roles: ["admin", "recepcion", "tecnico"] },
  { label: "Caja Diaria", icon: "💰", path: "/caja", roles: ["admin"] },
  { label: "Inventario", icon: "📦", path: "/inventario", roles: ["admin", "recepcion", "tecnico"] },
  { label: "Reparaciones", icon: "🛠️", path: "/reparaciones", roles: ["admin", "recepcion", "tecnico"] },
  { label: "Clientes", icon: "👥", path: "/clientes", roles: ["admin", "recepcion", "tecnico"] },
  { label: "Deudas", icon: "🤝", path: "/deudas", roles: ["admin"] },
  { label: "Reportes", icon: "📈", path: "/reportes", roles: ["admin"] },
  { label: "Ajustes", icon: "⚙️", path: "/ajustes", roles: ["admin", "recepcion", "tecnico"] },
];

const ADMIN_ITEMS = [
  { label: "Gestión de Equipo", icon: "👥", path: "/admin/usuarios" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { signOut, user, rol, loading } = useAuth();

  const getRoleLabel = (r: typeof rol) => {
    switch(r) {
      case 'admin': return 'Administrador';
      case 'recepcion': return 'Recepción';
      case 'tecnico': return 'Técnico Especialista';
      default: return user ? 'Sincronizando...' : 'Usuario';
    }
  };

  // Rol efectivo para filtrado de menú
  const effectiveRol = rol || (user && !loading ? 'tecnico' : null);

  return (
    <aside className="w-64 bg-white dark:bg-black border-r border-neutral-100 dark:border-neutral-900 flex flex-col h-screen transition-all select-none text-left">
      {/* Branding Section */}
      <div className="p-8 pb-10 flex flex-col items-center">
        <div className="relative group mb-4">
          <div className="absolute -inset-1 bg-gradient-to-r from-neutral-200 to-neutral-50 dark:from-neutral-800 dark:to-black rounded-full blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative p-3 bg-white dark:bg-neutral-900 rounded-full border border-neutral-100 dark:border-neutral-800 shadow-xl">
             <Image src="/logobuenoVectorizado.svg" alt="CTR Logo" width={48} height={48} style={{ width: '48px', height: '48px' }} className="dark:invert object-contain" priority />
          </div>
        </div>
        <div className="text-center">
          <h2 className="text-sm font-black tracking-[0.2em] text-neutral-900 dark:text-white uppercase italic">
            RelojerIa IA
          </h2>
          <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mt-1">Software System</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar">
        {loading && !rol && user ? (
          <div className="py-10 flex flex-col items-center justify-center opacity-50">
             <div className="w-5 h-5 border-2 border-neutral-200 border-t-neutral-800 animate-spin rounded-full mb-2"></div>
             <p className="text-[10px] font-black uppercase tracking-widest text-neutral-400 animate-pulse">Sincronizando...</p>
          </div>
        ) : (
          <>
            {NAV_ITEMS.filter(item => !effectiveRol || (item.roles as string[]).includes(effectiveRol)).map((item) => {
              const isActive = pathname === item.path;
              return (
                <Link 
                  key={item.path} 
                  href={item.path}
                  className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all duration-300 group ${
                    isActive 
                    ? "bg-black text-white dark:bg-white dark:text-black shadow-lg shadow-black/10 dark:shadow-white/5 scale-[1.02]" 
                    : "text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-900 hover:text-black dark:hover:text-white"
                  }`}
                >
                  <span className={`text-lg transition-transform duration-300 group-hover:scale-110 ${isActive ? "" : "grayscale group-hover:grayscale-0"}`}>
                    {item.icon}
                  </span>
                  <span className="tracking-tight">{item.label}</span>
                </Link>
              );
            })}

            {/* Admin Section Separator */}
            {effectiveRol === 'admin' && (
              <div className="pt-6 pb-2">
                <p className="px-5 text-[9px] font-black uppercase tracking-[0.3em] text-neutral-400 mb-2">Administración</p>
                {ADMIN_ITEMS.map((item) => {
                  const isActive = pathname === item.path;
                  return (
                    <Link 
                      key={item.path} 
                      href={item.path}
                      className={`flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-bold transition-all duration-300 group ${
                        isActive 
                        ? "bg-amber-600 text-white shadow-lg shadow-amber-600/20 scale-[1.02]" 
                        : "text-neutral-500 hover:bg-neutral-50 dark:hover:bg-neutral-900 hover:text-black dark:hover:text-white"
                      }`}
                    >
                      <span className={`text-lg transition-transform duration-300 group-hover:scale-110 ${isActive ? "" : "grayscale group-hover:grayscale-0"}`}>
                        {item.icon}
                      </span>
                      <span className="tracking-tight">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </>
        )}
      </nav>

      {/* User Area & Logout */}
      <div className="p-4 border-t border-neutral-100 dark:border-neutral-900 mt-auto bg-white dark:bg-black">
        <div className="bg-neutral-50 dark:bg-neutral-900/50 rounded-3xl p-4 border border-neutral-100 dark:border-neutral-800/50 min-h-[140px] flex flex-col justify-between shadow-sm">
          <div className="flex items-center gap-3">
            <div className={`flex-shrink-0 w-10 h-10 rounded-2xl flex items-center justify-center font-black text-xs shadow-lg uppercase ${
              user ? 'bg-neutral-900 text-white dark:bg-white dark:text-black' : 'bg-neutral-200 text-neutral-400'
            }`}>
              {user?.email?.substring(0, 1) || "?"}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-black text-neutral-900 dark:text-white truncate" title={user?.email || "Invitado"}>
                {user?.email?.split('@')[0] || "Sesión no iniciada"}
              </span>
              <span className={`text-[9px] font-black uppercase tracking-widest mt-0.5 ${rol ? 'text-amber-600 dark:text-amber-400' : 'text-neutral-400'}`}>
                {rol ? getRoleLabel(rol) : '---'}
              </span>
            </div>
          </div>
          
          <button 
            onClick={signOut}
            className="w-full mt-4 flex items-center justify-center gap-2 py-3 bg-white dark:bg-neutral-800 text-red-500 rounded-xl text-[10px] font-black uppercase tracking-widest border border-red-50 dark:border-red-900/20 hover:bg-red-50 dark:hover:bg-red-900/20 shadow-sm active:scale-95 transition-all group"
          >
            <span className="group-hover:translate-x-1 transition-transform">🚪</span>
            Cerrar Sesión
          </button>
        </div>
      </div>
    </aside>
  );
}
