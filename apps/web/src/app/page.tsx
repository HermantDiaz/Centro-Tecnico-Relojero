'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChatWidget } from '@relojeria/ui';
import { TALLER_KNOWLEDGE } from '@relojeria/ai-engine';
import type { ReparacionData } from '@relojeria/database';
import {
  Clock,
  Sparkles,
  ShieldCheck,
  Wrench,
  Search,
  ShoppingBag,
  MapPin,
  Watch,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  PhoneCall,
  Calendar,
  Copy,
  Check,
  HelpCircle,
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

function UrlTicketReader({ onTicketParam }: { onTicketParam: (ticket: string) => void }) {
  const searchParams = useSearchParams();

  useEffect(() => {
    const paramTicket =
      searchParams.get('recibo') || searchParams.get('ticket') || searchParams.get('orden');
    if (paramTicket) {
      onTicketParam(paramTicket);
    }
  }, [searchParams, onTicketParam]);

  return null;
}

export default function UnifiedWebPage() {
  const [ticketInput, setTicketInput] = useState('');
  const [reparacion, setReparacion] = useState<ReparacionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [busquedaRealizada, setBusquedaRealizada] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const adminErpUrl = process.env.NEXT_PUBLIC_ADMIN_URL || 'http://localhost:3001/login';
  const waNumber = TALLER_KNOWLEDGE.empresa.telefono.replace(/[^0-9]/g, '');

  const consultarTicket = React.useCallback(async (queryRaw: string) => {
    const raw = queryRaw.trim();
    if (!raw) return;

    setLoading(true);
    setErrorMsg('');
    setReparacion(null);
    setBusquedaRealizada(true);

    try {
      const res = await fetch(`/api/rastreo?recibo=${encodeURIComponent(raw)}`);
      const payload = await res.json().catch(() => ({}));

      if (res.status === 429) {
        setErrorMsg(
          payload.error ||
            'Has realizado demasiadas búsquedas seguidas. Por favor espera unos segundos e intenta de nuevo.'
        );
        return;
      }

      if (res.status === 400) {
        setErrorMsg(
          payload.error ||
            'El formato del número de recibo no es válido. Ingresa únicamente letras, números o guiones (ej. 1042).'
        );
        return;
      }

      if (!res.ok || !payload?.data) {
        setErrorMsg(
          `No encontramos ninguna orden de reparación registrada con el número de recibo "${raw}". Verifica el número exacto en tu boleta física o consúltanos por WhatsApp.`
        );
      } else {
        setReparacion(payload.data as ReparacionData);
      }
    } catch (err) {
      console.error('Error general en consulta de rastreo:', err);
      setErrorMsg(
        'Ocurrió un inconveniente al conectar con el servidor del taller. Por favor intenta de nuevo.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const handleTicketFromUrl = React.useCallback(
    (paramTicket: string) => {
      setTicketInput(paramTicket);
      consultarTicket(paramTicket);
      const rastreoSection = document.getElementById('rastreo');
      if (rastreoSection) {
        rastreoSection.scrollIntoView({ behavior: 'smooth' });
      }
    },
    [consultarTicket]
  );

  const handleBuscar = (e: React.FormEvent) => {
    e.preventDefault();
    consultarTicket(ticketInput);
  };

  const getStepStatus = (estadoRaw?: string) => {
    const st = (estadoRaw || '').toLowerCase();
    if (st.includes('entregado')) return 4;
    if (st.includes('listo')) return 3;
    if (
      st.includes('repara') ||
      st.includes('taller') ||
      st.includes('repuesto') ||
      st.includes('proceso') ||
      st.includes('espera')
    ) {
      return 2;
    }
    return 1;
  };

  const currentStep = reparacion ? getStepStatus(reparacion.estado) : 1;

  const presupuestoTotal = reparacion
    ? Number(reparacion.precio_final ?? reparacion.costo_estimado ?? 0)
    : 0;

  const abonoRealizado = reparacion ? Number(reparacion.abono ?? 0) : 0;

  const saldoPendiente = reparacion
    ? Number(
        reparacion.saldo_pendiente ??
          reparacion.saldo ??
          Math.max(0, presupuestoTotal - abonoRealizado)
      )
    : 0;

  const motivoFalla =
    reparacion?.problema_cliente ||
    reparacion?.falla_declarada ||
    reparacion?.diagnostico_tecnico ||
    'Mantenimiento general y revisión técnica';

  const fechaRaw = reparacion?.fecha_compromiso || reparacion?.fecha_promesa;
  const fechaEntregaPrometida = fechaRaw
    ? !isNaN(new Date(fechaRaw).getTime())
      ? new Date(fechaRaw).toLocaleDateString('es-NI', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          timeZone: 'UTC',
        })
      : fechaRaw
    : undefined;

  const handleCopyLink = () => {
    if (!reparacion?.numero_recibo) return;
    const shareUrl = `${window.location.origin}/?recibo=${encodeURIComponent(
      reparacion.numero_recibo
    )}#rastreo`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-slate-950">
      {/* Barra de Navegación Pública B2C Unificada */}
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
            <a
              href="#rastreo"
              className="hover:text-amber-400 transition-colors flex items-center gap-1.5"
            >
              <Search className="w-4 h-4 text-amber-400" />
              Rastrear Reparación
            </a>
            <a href="#catalogo" className="hover:text-amber-400 transition-colors">
              Catálogo Online
            </a>
            <a href="#servicios" className="hover:text-amber-400 transition-colors">
              Taller Certificado
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <a
              href="#rastreo"
              className="bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
            >
              Consultar Recibo
            </a>
            <a
              href={adminErpUrl}
              className="text-slate-500 hover:text-slate-300 p-2.5 rounded-lg text-xs flex items-center gap-1 transition-colors"
              title="Acceso Personal de Taller (ERP)"
            >
              <Lock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ERP</span>
            </a>
          </div>
        </div>
      </header>

      {/* Hero Principal */}
      <section className="relative overflow-hidden py-16 sm:py-24 px-4 sm:px-6 lg:px-8 border-b border-slate-900">
        <div className="max-w-5xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-widest">
            <Sparkles className="w-3.5 h-3.5" />
            Tienda Digital, Rastreo en Vivo y Asistente IA
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-tight [text-wrap:balance]">
            Alta Relojería y Precisión Técnica en{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-500 to-amber-600">
              Managua
            </span>
          </h1>

          <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed [text-wrap:pretty]">
            Especialistas en mantenimiento de relojes suizos y japoneses. Consulta el estado de tu
            orden en tiempo real, explora nuestra vitrina o conversa con nuestro Asistente
            Inteligente 24/7.
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
            <a
              href="#rastreo"
              className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold px-8 py-4 rounded-2xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-colors"
            >
              <Search className="w-5 h-5" />
              Rastrear mi Reloj en Taller
            </a>

            <a
              href="#catalogo"
              className="w-full sm:w-auto bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 font-semibold px-8 py-4 rounded-2xl flex items-center justify-center gap-2 transition-colors"
            >
              <ShoppingBag className="w-5 h-5 text-amber-400" />
              Ver Catálogo en Línea
            </a>
          </div>
        </div>
      </section>

      {/* Sección Integrada de Rastreo de Reparaciones en Vivo */}
      <section
        id="rastreo"
        className="py-16 px-4 sm:px-6 lg:px-8 bg-slate-900/30 border-b border-slate-900 scroll-mt-20"
      >
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
              Consulta de Taller en Tiempo Real
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white [text-wrap:balance]">
              Seguimiento de Orden de Reparación
            </h2>
            <p className="text-slate-400 text-sm max-w-xl mx-auto [text-wrap:pretty]">
              Ingresa el número de recibo impreso en tu boleta física para verificar la etapa actual
              de tu reloj, el diagnóstico y tu saldo pendiente.
            </p>
          </div>

          {/* Buscador de Recibo */}
          <form
            onSubmit={handleBuscar}
            className="bg-slate-900/90 border border-slate-800/90 p-3 sm:p-4 rounded-2xl shadow-2xl flex flex-col sm:flex-row gap-3 backdrop-blur-sm"
          >
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
              <input
                type="text"
                value={ticketInput}
                onChange={(e) => setTicketInput(e.target.value)}
                placeholder="Ingresa tu número de recibo (ej: 1042, #1042)..."
                disabled={loading}
                className="w-full pl-12 pr-4 py-3 bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl text-white placeholder-slate-500 text-sm outline-none transition-colors disabled:opacity-50"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !ticketInput.trim()}
              className="min-h-[44px] bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold px-7 py-3 rounded-xl transition-colors shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center gap-2 text-sm">
                  <Clock className="w-4 h-4 animate-spin text-slate-950" />
                  Consultando...
                </span>
              ) : (
                <>
                  <span className="text-sm">Rastrear</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Error si no existe el recibo */}
          {errorMsg && (
            <div className="bg-rose-950/40 border border-rose-500/30 text-rose-300 p-5 rounded-2xl flex items-start gap-3.5 text-sm animate-in fade-in">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-rose-200">No encontramos tu recibo</p>
                <p className="text-rose-300/90 leading-relaxed [text-wrap:pretty]">{errorMsg}</p>
                <div className="pt-2">
                  <a
                    href={`https://wa.me/${waNumber}?text=${encodeURIComponent(
                      `Hola, no logro rastrear mi reparación con el recibo ${ticketInput}`
                    )}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-rose-200 underline font-medium hover:text-white"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    Escríbenos a soporte por WhatsApp para asistirte
                  </a>
                </div>
              </div>
            </div>
          )}

          {/* Ayuda inicial */}
          {!busquedaRealizada && !reparacion && (
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 text-center space-y-3">
              <div className="w-10 h-10 rounded-full bg-slate-800/80 border border-slate-700/60 flex items-center justify-center mx-auto text-amber-400">
                <HelpCircle className="w-5 h-5" />
              </div>
              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-xs font-semibold text-white">
                  ¿Dónde encuentro mi número de recibo?
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed [text-wrap:pretty]">
                  Está en la esquina superior derecha de tu boleta física, o bien puedes escribirle
                  directamente a nuestro Chatbot en la esquina inferior derecha.
                </p>
              </div>
            </div>
          )}

          {/* Resultado de la Reparación */}
          {reparacion && (
            <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-7 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800/90">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      Recibo Oficial
                    </span>
                    <button
                      onClick={handleCopyLink}
                      className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                      title="Copiar enlace directo de este recibo"
                    >
                      {copiedLink ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400 font-medium">¡Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Compartir enlace</span>
                        </>
                      )}
                    </button>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2 pt-1 tabular-nums">
                    #{reparacion.numero_recibo}
                    <span className="text-amber-400 font-medium text-xl sm:text-2xl">
                      • {reparacion.marca}
                    </span>
                  </h3>

                  <p className="text-xs text-slate-400">
                    Cliente:{' '}
                    <span className="text-slate-200 font-semibold">
                      {reparacion.clientes?.nombre_completo || 'Cliente Registrado'}
                    </span>
                  </p>
                </div>

                <div>
                  <span
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider ${
                      currentStep === 3
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-lg shadow-emerald-500/10'
                        : currentStep === 4
                        ? 'bg-slate-800 text-slate-300 border border-slate-700'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-lg shadow-amber-500/10'
                    }`}
                  >
                    <span className="w-2.5 h-2.5 rounded-full bg-current animate-pulse"></span>
                    {reparacion.estado}
                  </span>
                </div>
              </div>

              {/* Stepper de 4 Etapas */}
              <div className="py-2">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    Línea de Tiempo del Servicio
                  </span>
                  <span className="text-xs text-amber-400/90 font-medium tabular-nums">
                    Paso {currentStep} de 4
                  </span>
                </div>

                <div className="relative">
                  <div className="absolute top-4 left-6 right-6 h-1 bg-slate-800 -z-0 rounded-full hidden sm:block"></div>
                  <div
                    className="absolute top-4 left-6 h-1 bg-gradient-to-r from-amber-500 to-emerald-400 -z-0 rounded-full hidden sm:block transition-[width] duration-500"
                    style={{
                      width:
                        currentStep === 1
                          ? '0%'
                          : currentStep === 2
                          ? '33%'
                          : currentStep === 3
                          ? '66%'
                          : '100%',
                    }}
                  ></div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-2">
                    <div className="flex flex-col items-center text-center">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs mb-2 z-10 transition-colors ${
                          currentStep >= 1
                            ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                            : 'bg-slate-800 text-slate-500 border border-slate-700'
                        }`}
                      >
                        {currentStep > 1 ? (
                          <CheckCircle2 className="w-5 h-5 text-slate-950" />
                        ) : (
                          '1'
                        )}
                      </div>
                      <span className="text-xs font-semibold text-slate-200">Recepción</span>
                      <span className="text-[10px] text-slate-400 mt-0.5">Diagnóstico inicial</span>
                    </div>

                    <div className="flex flex-col items-center text-center">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs mb-2 z-10 transition-colors ${
                          currentStep >= 2
                            ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                            : 'bg-slate-800 text-slate-500 border border-slate-700'
                        }`}
                      >
                        {currentStep > 2 ? (
                          <CheckCircle2 className="w-5 h-5 text-slate-950" />
                        ) : (
                          '2'
                        )}
                      </div>
                      <span className="text-xs font-semibold text-slate-200">Mesa de Trabajo</span>
                      <span className="text-[10px] text-slate-400 mt-0.5">Taller en proceso</span>
                    </div>

                    <div className="flex flex-col items-center text-center">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs mb-2 z-10 transition-colors ${
                          currentStep >= 3
                            ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-400/50'
                            : 'bg-slate-800 text-slate-500 border border-slate-700'
                        }`}
                      >
                        {currentStep > 3 ? (
                          <CheckCircle2 className="w-5 h-5 text-slate-950" />
                        ) : (
                          '3'
                        )}
                      </div>
                      <span
                        className={`text-xs font-semibold ${
                          currentStep === 3 ? 'text-emerald-400 font-bold' : 'text-slate-200'
                        }`}
                      >
                        Listo
                      </span>
                      <span className="text-[10px] text-slate-400 mt-0.5">Listo para retiro</span>
                    </div>

                    <div className="flex flex-col items-center text-center">
                      <div
                        className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs mb-2 z-10 transition-colors ${
                          currentStep === 4
                            ? 'bg-slate-400 text-slate-950 shadow-md'
                            : 'bg-slate-800 text-slate-500 border border-slate-700'
                        }`}
                      >
                        4
                      </div>
                      <span className="text-xs font-semibold text-slate-300">Entregado</span>
                      <span className="text-[10px] text-slate-500 mt-0.5">Garantía activa</span>
                    </div>
                  </div>
                </div>
              </div>

              {currentStep === 3 && (
                <div className="bg-emerald-950/40 border border-emerald-500/40 p-4 sm:p-5 rounded-xl flex items-start gap-4">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-400">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <h4 className="text-sm font-bold text-emerald-300">
                      ¡Tu reloj está completado y listo para retiro!
                    </h4>
                    <p className="text-xs text-emerald-200/90 leading-relaxed [text-wrap:pretty]">
                      Puedes pasar por nuestro taller ubicado en{' '}
                      <strong className="text-white">{TALLER_KNOWLEDGE.empresa.ubicacion}</strong>.
                      Recuerda presentar tu boleta o comprobante al retirar tu pieza.
                    </p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/60 p-5 rounded-xl border border-slate-800/90 text-sm">
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Modelo / Descripción
                  </p>
                  <p className="text-slate-100 font-medium mt-1">
                    {reparacion.modelo_descripcion || 'No especificado'}
                  </p>
                </div>

                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Falla Declarada / Trabajo Solicitado
                  </p>
                  <p className="text-slate-100 font-medium mt-1">{motivoFalla}</p>
                </div>

                {fechaEntregaPrometida && (
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-amber-400" />
                      Fecha Promesa de Entrega
                    </p>
                    <p className="text-slate-100 font-medium mt-1">{fechaEntregaPrometida}</p>
                  </div>
                )}

                {reparacion.veces_garantia ? (
                  <div>
                    <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-amber-400" />
                      Servicio en Garantía
                    </p>
                    <p className="text-amber-400 font-medium mt-1 tabular-nums">
                      Revisión #{reparacion.veces_garantia} bajo garantía oficial
                    </p>
                  </div>
                ) : null}

                <div className="pt-2 sm:pt-0">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Presupuesto Total
                  </p>
                  <p className="text-slate-100 font-semibold text-base mt-1 tabular-nums">
                    ${presupuestoTotal.toFixed(2)} USD
                  </p>
                </div>

                <div className="pt-2 sm:pt-0">
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    Saldo Pendiente a la Entrega
                  </p>
                  <p
                    className={`text-base font-extrabold mt-1 tabular-nums ${
                      saldoPendiente > 0 ? 'text-amber-400' : 'text-emerald-400'
                    }`}
                  >
                    {saldoPendiente > 0
                      ? `$${saldoPendiente.toFixed(2)} USD`
                      : 'Totalmente Cancelado'}
                  </p>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400 border-t border-slate-800/80">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  Garantía oficial de taller por 90 días en mano de obra.
                </span>

                <a
                  href={`https://wa.me/${waNumber}?text=${encodeURIComponent(
                    `Hola Centro Técnico Relojero, tengo una consulta sobre mi orden #${reparacion.numero_recibo} (${reparacion.marca})`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-amber-400 hover:text-amber-300 font-semibold transition-colors"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  Consultar por WhatsApp
                </a>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Sección Tienda en Línea */}
      <section
        id="catalogo"
        className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full scroll-mt-20"
      >
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
              Boutique Digital B2C
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1 [text-wrap:balance]">
              Catálogo en Línea — Próximamente
            </h2>
          </div>
          <p className="text-sm text-slate-400 max-w-md [text-wrap:pretty]">
            Estamos sincronizando nuestro inventario físico con la pasarela web. Mientras tanto,
            puedes consultar disponibilidad inmediata en nuestro Chatbot.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {RELOJES_PREVIEW.map((reloj, idx) => (
            <div
              key={idx}
              className="bg-slate-900/70 border border-slate-800/90 hover:border-amber-500/40 rounded-2xl p-6 flex flex-col justify-between transition-colors group"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    {reloj.tag}
                  </span>
                  <span className="text-xs text-slate-500 font-medium">{reloj.marca}</span>
                </div>

                <div className="h-44 rounded-xl bg-gradient-to-b from-slate-950 to-slate-900 border border-slate-800/60 flex flex-col items-center justify-center mb-5 group-hover:border-amber-500/20 transition-colors">
                  <Watch className="w-16 h-16 text-amber-400/80 stroke-[1.5]" />
                  <span className="text-[11px] text-slate-500 mt-2">Vista previa de catálogo</span>
                </div>

                <h3 className="text-lg font-bold text-white [text-wrap:balance]">{reloj.nombre}</h3>
                <p className="text-xs text-slate-400 mt-1">{reloj.calibre}</p>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Precio de Lista</span>
                  <span className="text-lg font-extrabold text-amber-400 tabular-nums">
                    {reloj.precio}
                  </span>
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
      <section
        id="servicios"
        className="py-16 bg-slate-900/40 border-y border-slate-900 px-4 sm:px-6 lg:px-8 scroll-mt-20"
      >
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-amber-400">
              Servicio Técnico Especializado
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-1 [text-wrap:balance]">
              Estándares de Taller Certificado
            </h2>
            <p className="text-sm text-slate-400 mt-2 [text-wrap:pretty]">
              ¿Necesitas cotizar una reparación? Abre el asistente en la esquina inferior derecha y
              consulta al instante.
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
                  <h3 className="text-base font-bold text-white [text-wrap:balance]">
                    {srv.titulo}
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed [text-wrap:pretty]">
                    {srv.desc}
                  </p>
                </div>
                <div className="mt-5 pt-3 border-t border-slate-900 flex items-center justify-between">
                  <span className="text-xs text-slate-500">Tarifa estimada</span>
                  <span className="text-xs font-bold text-amber-400 tabular-nums">
                    {srv.precio}
                  </span>
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
            <span>{TALLER_KNOWLEDGE.empresa.ubicacion}</span>
          </div>
          <div>
            <span>© 2026 Centro Técnico Relojero • Ecosistema B2C & Asistente IA</span>
          </div>
        </div>
      </footer>

      {/* Lector de parámetros URL aislado en Suspense para no bloquear el SSR de la página */}
      <Suspense fallback={null}>
        <UrlTicketReader onTicketParam={handleTicketFromUrl} />
      </Suspense>

      {/* Widget del Chatbot Activo */}
      <ChatWidget defaultOpen={true} />
    </div>
  );
}
