import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Image from "next/image";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "RELOJERIA IA - Sistema Administrativo",
  description: "Gestión inteligente para relojerías modernas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${inter.className} bg-neutral-50 dark:bg-black text-neutral-900 dark:text-neutral-100`}>
        <div className="flex h-screen overflow-hidden">
          {/* Sidebar Lateral */}
          <aside className="w-64 bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 flex flex-col hidden md:flex">
            <div className="p-6 flex items-center gap-3">
              <Image src="/logo.svg" alt="CTR Logo" width={40} height={40} className="dark:invert" />
              <span className="font-bold text-xl tracking-tight">CTR RELOJERIA</span>
            </div>
            
            <nav className="flex-1 px-4 space-y-2 mt-4">
              <Link href="/" className="flex items-center gap-3 px-4 py-3 bg-black text-white dark:bg-white dark:text-black rounded-xl font-medium transition-all">
                <span>📊 Dashboard</span>
              </Link>
              <Link href="/inventario" className="flex items-center gap-3 px-4 py-3 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-all">
                <span>📦 Inventario</span>
              </Link>
              <Link href="/reparaciones" className="flex items-center gap-3 px-4 py-3 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-all">
                <span>🛠️ Reparaciones</span>
              </Link>
              <Link href="/caja" className="flex items-center gap-3 px-4 py-3 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-all">
                <span>💰 Caja / Finanzas</span>
              </Link>
              <Link href="/deudas" className="flex items-center gap-3 px-4 py-3 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-all">
                <span>🤝 Deudas</span>
              </Link>
            </nav>

            <div className="p-4 border-t border-neutral-200 dark:border-neutral-800">
              <div className="flex items-center gap-3 px-4 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl cursor-pointer transition-all">
                <div className="w-8 h-8 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center font-bold text-xs">
                  AD
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm font-semibold truncate text-black dark:text-white">Administrador</span>
                  <span className="text-xs text-neutral-500 truncate">Herman Diaz</span>
                </div>
              </div>
            </div>
          </aside>

          {/* Área de Contenido Principal */}
          <main className="flex-1 overflow-y-auto bg-neutral-50 dark:bg-black p-4 md:p-8">
            <header className="flex justify-between items-center mb-8 md:hidden">
              <Image src="/logo.svg" alt="CTR Logo" width={32} height={32} className="dark:invert" />
              <button className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                ☰
              </button>
            </header>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
