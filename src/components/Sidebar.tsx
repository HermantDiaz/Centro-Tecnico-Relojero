"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { useAuth } from "./AuthProvider";

const NAV_ITEMS = [
  { label: "Dashboard", icon: "📊", path: "/" },
  { label: "Inventario", icon: "📦", path: "/inventario" },
  { label: "Reparaciones", icon: "🛠️", path: "/reparaciones" },
  { label: "Caja / Finanzas", icon: "💰", path: "/finanzas" },
  { label: "Deudas", icon: "🤝", path: "/deudas" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { signOut, user } = useAuth();

  return (
    <aside className="w-64 bg-white dark:bg-black border-r border-neutral-100 dark:border-neutral-900 flex flex-col h-screen transition-all">
      {/* Branding Section */}
      <div className="p-8 pb-10 flex flex-col items-center">
        <div className="relative group mb-4">
          <div className="absolute -inset-1 bg-gradient-to-r from-neutral-200 to-neutral-50 dark:from-neutral-800 dark:to-black rounded-full blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative p-3 bg-white dark:bg-neutral-900 rounded-full border border-neutral-100 dark:border-neutral-800 shadow-xl">
             <Image src="/logobuenoVectorizado.svg" alt="CTR Logo" width={48} height={48} className="dark:invert object-contain" />
          </div>
        </div>
        <div className="text-center">
          <h2 className="text-sm font-black tracking-[0.2em] text-neutral-900 dark:text-white uppercase italic">
            Relojería IA
          </h2>
          <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mt-1">Software System</p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 space-y-2">
        {NAV_ITEMS.map((item) => {
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
      </nav>

      {/* User Area & Logout */}
      <div className="p-6 border-t border-neutral-100 dark:border-neutral-900">
        <div className="bg-neutral-50 dark:bg-neutral-900/50 rounded-3xl p-4 border border-neutral-100 dark:border-neutral-800/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-neutral-900 dark:bg-white rounded-2xl flex items-center justify-center text-white dark:text-black font-black text-xs shadow-lg">
              {user?.email?.substring(0, 1).toUpperCase() || "A"}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-xs font-black text-neutral-900 dark:text-white truncate">
                {user?.email?.split('@')[0] || "Administrador"}
              </span>
              <span className="text-[9px] font-bold text-neutral-400 uppercase tracking-tighter">Herman Diaz</span>
            </div>
          </div>
          
          <button 
            onClick={signOut}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-white dark:bg-neutral-800 text-red-500 rounded-xl text-[10px] font-black uppercase tracking-widest border border-red-50 dark:border-red-900/20 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all shadow-sm active:scale-95 group"
          >
            <span className="group-hover:translate-x-1 transition-transform">🚪</span>
            Cerrar Sesión
          </button>
        </div>
      </div>
    </aside>
  );
}
