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

import Sidebar from "@/components/Sidebar";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.className} bg-neutral-50 dark:bg-black text-neutral-900 dark:text-neutral-100`}>
        <div className="flex h-screen overflow-hidden">
          {/* Sidebar Lateral (Componente Cliente) */}
          <Sidebar />

          {/* Área de Contenido Principal */}
          <main className="flex-1 overflow-y-auto bg-neutral-50 dark:bg-black p-4 md:p-8">
            <header className="flex justify-between items-center mb-8 md:hidden">
              <Image src="/logobuenoVectorizado.svg" alt="CTR Logo" width={48} height={48} className="dark:invert object-contain" />
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
