"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";

const routes = [
  { name: "Dashboard", icon: "📊", path: "/" },
  { name: "Inventario", icon: "📦", path: "/inventario" },
  { name: "Reparaciones", icon: "🛠️", path: "/reparaciones" },
  { name: "Caja / Finanzas", icon: "💰", path: "/caja" },
  { name: "Deudas", icon: "🤝", path: "/deudas" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 flex flex-col hidden md:flex h-full">
      <div className="p-6 flex items-center gap-2">
        <Image src="/logobuenoVectorizado.svg" alt="CTR Logo" width={64} height={64} className="dark:invert object-contain" />
        <div className="flex flex-col">
          <span className="font-black text-xl leading-none tracking-tighter">RELOJERÍA</span>
          <span className="text-[10px] font-bold text-neutral-400 tracking-[0.2em] uppercase">Software System</span>
        </div>
      </div>
      
      <nav className="flex-1 px-4 space-y-2 mt-4">
        {routes.map((route) => {
          const isActive = pathname === route.path;
          return (
            <Link 
              key={route.path}
              href={route.path} 
              className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all ${
                isActive 
                  ? "bg-black text-white dark:bg-white dark:text-black shadow-lg shadow-black/10 dark:shadow-white/5" 
                  : "text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              }`}
            >
              <span className="text-lg">{route.icon}</span>
              <span>{route.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center gap-3 px-4 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl cursor-pointer transition-all">
          <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center font-bold text-xs">
            AD
          </div>
          <div className="flex flex-col overflow-hidden text-black dark:text-white">
            <span className="text-sm font-semibold truncate">Administrador</span>
            <span className="text-xs text-neutral-500 truncate font-medium">Herman Diaz</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
