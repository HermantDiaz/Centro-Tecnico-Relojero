'use client';

import React from 'react';
import Link from 'next/link';
import ChatWidget from '@/components/ChatWidget';
import {
  Clock,
  Sparkles,
  ShieldCheck,
  Wrench,
  Search,
  ShoppingBag,
  MapPin,
  Phone,
  ArrowRight,
  Watch,
  CheckCircle2,
  Lock,
} from 'lucide-react';

const RELOJES_PREVIEW = [
  {
    nombre: 'Seiko 5 Sports Automatic',
    marca: 'Seiko',
    calibre: 'Automático 4R36 • 24 Joyas',
    precio: '$285.00 USD',
    estado: 'Próximamente en Tienda Online',
    tag: 'Destacado',
  },
  {
    nombre: 'Tissot PRX Powermatic 80',
    marca: 'Tissot Swiss Made',
    calibre: 'Automático Suizo • 80h Reserva',
    precio: '$725.00 USD',
    estado: 'Próximamente en Tienda Online',
    tag: 'Alta Gama',
  },
  {
    nombre: 'Citizen Promaster Diver 200m',
    marca: 'Citizen Eco-Drive',
    calibre: 'Solar Eco-Drive • ISO 6425',
    precio: '$340.00 USD',
    estado: 'Próximamente en Tienda Online',
    tag: 'Sumergible',
  },
];

const SERVICIOS_TALLER = [
  {
    titulo: 'Mantenimiento Completo',
    desc: 'Desarme integral del calibre, lavado ultrasónico, lubricación con aceites suizos Moebius y calibración electrónica.',
    precio: 'Desde $35 USD',
  },
  {
    titulo: 'Cambio de Batería Suiza',
    desc: 'Instalación express de baterías originales Renata / Maxell con revisión de consumo y sellado de empaque.',
    precio: '$5 - $10 USD',
  },
  {
    titulo: 'Cristales Mineral y Zafiro',
    desc: 'Sustitución de cristales planos, curvos o de zafiro antirreflejo con prueba de hermeticidad incluida.',
    precio: '$15 - $35 USD',
  },
  {
    titulo: 'Pulido y Restauración Estética',
    desc: 'Devolvemos el brillo espejo y cepillado satinado original a cajas y brazaletes de acero inoxidable.',
    precio: '$20 - $40 USD',
  },
];

export default function TiendaOnlinePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Barra de Navegación Pública B2C */}
      <header className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <span className="font-extrabold text-lg tracking-tight text-white block leading-none">
                CENTRO TÉCNICO RELOJERO
              </span>
              <span className="text-[11px] text-amber-400 font-medium tracking-widest uppercase">
                Managua • Nicaragua
              </span>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
            <a href="#catalogo" className="hover:text-amber-400 transition-colors">
              Catálogo Online
            </a>
            <a href="#servicios" className="hover:text-amber-400 transition-colors">
              Taller Certificado
            </a>
            <Link href="/rastreo" className="hover:text-amber-400 transition-colors flex items-center gap-1.5">
              <Search className="w-4 h-4 text-amber-400" />
              Rastrear Reparación
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/rastreo"
              className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all"
            >
              Consultar Recibo
            </Link>
            <Link
              href="/login"
              className="text-slate-500 hover:text-slate-300 p-2 rounded-lg text-xs flex items-center gap-1"
              title="Acceso Personal de Taller (ERP)"
            >
              <Lock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ERP</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Principal */}
      <section className="relative overflow-hidden py-20 sm:py-28 px-4 sm:px-6 lg:px-8 border-b border-slate-900">
        <div className="max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5" />
            Nueva Experiencia Digital con IA Integrada
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-tight">
            Alta Relojería y Precisión Técnica en{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-500 to-amber-600">
              Managua
            </span>
          </h1>

          <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Especialistas en mantenimiento de relojes suizos y japoneses. Consulta el estado de tu orden en tiempo real o conversa con nuestro Asistente Inteligente 24/7.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/rastreo"
              className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold px-8 py-4 rounded-2xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all"
            >
              <Search className="w-5 h-5" />
              Rastrear mi Reloj en Taller
            </Link>

            <a
              href="#catalogo"
              className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 font-semibold px-8 py-4 rounded-2xl flex items-center justify-center gap-2 transition-all"
            >
              <ShoppingBag className="w-5 h-5 text-amber-400" />
              Ver Tienda en Línea
            </a>
          </div>
        </div>
      </section>

      {/* Sección Tienda en Línea (Próximamente) */}
      <section id="catalogo" className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
              Boutique Digital B2C
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              Catálogo en Línea — Próximamente
            </h2>
          </div>
          <p className="text-sm text-slate-400 max-w-md">
            Estamos sincronizando nuestro inventario físico con la pasarela web. Mientras tanto, puedes consultar disponibilidad inmediata en nuestro Chatbot.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {RELOJES_PREVIEW.map((reloj, idx) => (
            <div
              key={idx}
              className="bg-slate-900/70 border border-slate-800/90 hover:border-amber-500/40 rounded-2xl p-6 flex flex-col justify-between transition-all group"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {reloj.tag}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">{reloj.marca}</span>
                </div>

                {/* Ilustración de Reloj */}
                <div className="h-44 rounded-xl bg-gradient-to-b from-slate-950 to-slate-900 border border-slate-800/60 flex flex-col items-center justify-center mb-5 group-hover:border-amber-500/20 transition-all">
                  <Watch className="w-16 h-16 text-amber-400/80 stroke-[1.5]" />
                  <span className="text-[11px] text-slate-500 mt-2">Vista previa de catálogo</span>
                </div>

                <h3 className="text-lg font-bold text-white">{reloj.nombre}</h3>
                <p className="text-xs text-slate-400 mt-1">{reloj.calibre}</p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Precio de Lista</span>
                  <span className="text-lg font-extrabold text-amber-400">{reloj.precio}</span>
                </div>
                <span className="text-xs bg-slate-800 text-slate-300 px-3 py-1.5 rounded-lg font-medium">
                  Próximamente
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Sección Servicios de Taller */}
      <section id="servicios" className="py-16 bg-slate-900/40 border-y border-slate-900 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
              Servicio Técnico Especializado
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1">
              Estándares de Taller Certificado
            </h2>
            <p className="text-sm text-slate-400 mt-2">
              ¿Necesitas cotizar una reparación? Abre el asistente en la esquina inferior derecha y consulta al instante.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {SERVICIOS_TALLER.map((srv, i) => (
              <div
                key={i}
                className="bg-slate-950 border border-slate-800/90 p-6 rounded-2xl flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4">
                    <Wrench className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-white">{srv.titulo}</h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">{srv.desc}</p>
                </div>
                <div className="mt-5 pt-3 border-t border-slate-900 flex items-center justify-between">
                  <span className="text-xs text-slate-500">Tarifa estimada</span>
                  <span className="text-xs font-bold text-amber-400">{srv.precio}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-10 px-4 sm:px-6 lg:px-8 bg-slate-950 border-t border-slate-900 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-amber-400" />
            <span>Plaza España, del semáforo 1c al lago, Módulo #4, Managua, Nicaragua.</span>
          </div>
          <div>
            <span>© 2026 Centro Técnico Relojero • Ecosistema B2C & Asistente IA</span>
          </div>
        </div>
      </footer>

      {/* Widget del Chatbot Activo (Se abre por defecto al entrar a la tienda) */}
      <ChatWidget defaultOpen={true} />
    </div>
  );
}

