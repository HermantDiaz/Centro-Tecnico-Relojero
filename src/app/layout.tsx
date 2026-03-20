"use client";

import { Inter } from "next/font/google";
import "./globals.css";
import Image from "next/image";
import Sidebar from "@/components/Sidebar";
import { AuthProvider } from "@/components/AuthProvider";
import { usePathname } from "next/navigation";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  return (
    <html lang="es" suppressHydrationWarning>
      <body className={`${inter.className} bg-neutral-50 dark:bg-black text-neutral-900 dark:text-neutral-100`}>
        <AuthProvider>
          <div className="flex h-screen overflow-hidden">
            {/* Sidebar Lateral (Solo si NO es login) */}
            {!isLoginPage && <Sidebar />}

            {/* Área de Contenido Principal */}
            <main className={`flex-1 overflow-y-auto custom-scrollbar ${isLoginPage ? 'bg-white dark:bg-black p-0' : 'bg-neutral-50 dark:bg-black p-4 md:p-8 pb-24 md:pb-32'}`}>
              {!isLoginPage && (
                <header className="flex justify-between items-center mb-8 md:hidden">
                  <Image src="/logobuenoVectorizado.svg" alt="CTR Logo" width={48} height={48} className="dark:invert object-contain" />
                  <button className="p-2 bg-neutral-100 dark:bg-neutral-800 rounded-lg">
                    ☰
                  </button>
                </header>
              )}
              {children}
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
