import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Centro Técnico Relojero | Tienda, Taller Certificado y Rastreo en Vivo',
  description:
    'Especialistas en alta relojería, mantenimiento de relojes suizos y japoneses, seguimiento de reparaciones en tiempo real y asistencia con IA en Managua, Nicaragua.',
};

export default function WebRootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="dark">
      <body className={`${inter.className} bg-slate-950 text-slate-100 antialiased`}>
        {children}
      </body>
    </html>
  );
}

