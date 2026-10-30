'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Search,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ShieldCheck,
  PhoneCall,
  Calendar,
  Copy,
  Check,
  ArrowLeft,
  Sparkles,
  HelpCircle,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { TALLER_KNOWLEDGE } from '@/lib/tallerKnowledge';

interface ReparacionData {
  id?: string;
  numero_recibo: string;
  marca: string;
  modelo_descripcion?: string;
  estado: string;
  falla_declarada?: string;
  problema_cliente?: string;
  diagnostico_tecnico?: string;
  costo_estimado?: number;
  precio_final?: number;
  abono?: number;
  saldo?: number;
  saldo_pendiente?: number;
  fecha_promesa?: string;
  fecha_compromiso?: string;
  fecha_ingreso?: string;
  veces_garantia?: number;
  clientes?: {
    nombre_completo?: string;
    telefono?: string;
  };
}

function RastreoContent() {
  const searchParams = useSearchParams();
  const [ticketInput, setTicketInput] = useState('');
  const [reparacion, setReparacion] = useState<ReparacionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [busquedaRealizada, setBusquedaRealizada] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Limpieza del número telefónico para WhatsApp
  const waNumber = TALLER_KNOWLEDGE.empresa.telefono.replace(/[^0-9]/g, '');

  // Cargar ticket desde la URL si viene en los parámetros (ej: /rastreo?recibo=1042 o ?ticket=1042)
  useEffect(() => {
    const paramTicket =
      searchParams.get('recibo') || searchParams.get('ticket') || searchParams.get('orden');
    if (paramTicket) {
      setTicketInput(paramTicket);
      consultarTicket(paramTicket);
    }
  }, [searchParams]);

  const consultarTicket = async (queryRaw: string) => {
    const raw = queryRaw.trim();
    if (!raw) return;

    // Normalizamos el número quitando prefijos como "#", "REP-", "REC-"
    const cleanNumber = raw.replace(/^[#\s]*(?:REP-|REC-)?/i, '').trim();

    setLoading(true);
    setErrorMsg('');
    setReparacion(null);
    setBusquedaRealizada(true);

    try {
      // 1. Buscamos primero por coincidencia exacta del string ingresado
      let { data, error } = await supabase
        .from('reparaciones')
        .select(`
          *,
          clientes:cliente_id (nombre_completo, telefono)
        `)
        .eq('numero_recibo', raw)
        .maybeSingle();

      // 2. Si no encuentra con el raw, buscamos con el número limpio
      if (!data && cleanNumber !== raw) {
        const resClean = await supabase
          .from('reparaciones')
          .select(`
            *,
            clientes:cliente_id (nombre_completo, telefono)
          `)
          .eq('numero_recibo', cleanNumber)
          .maybeSingle();
        data = resClean.data;
        error = resClean.error || error;
      }

      // 3. Fallback de búsqueda con ILIKE por si está guardado con formato especial
      if (!data && cleanNumber) {
        const resLike = await supabase
          .from('reparaciones')
          .select(`
            *,
            clientes:cliente_id (nombre_completo, telefono)
          `)
          .ilike('numero_recibo', `%${cleanNumber}%`)
          .limit(1)
          .maybeSingle();
        data = resLike.data;
      }

      if (error) {
        console.error('Error consultando Supabase:', error);
      }

      if (!data) {
        setErrorMsg(
          `No encontramos ninguna orden de reparación registrada con el número de recibo "${raw}". Verifica el número en tu boleta física o consúltanos por WhatsApp.`
        );
      } else {
        const clienteData = Array.isArray(data.clientes) ? data.clientes[0] : data.clientes;
        setReparacion({
          ...data,
          clientes: clienteData,
        } as ReparacionData);
      }
    } catch (err) {
      console.error('Error general en consulta de rastreo:', err);
      setErrorMsg('Ocurrió un inconveniente al conectar con el servidor del taller. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const handleBuscar = (e: React.FormEvent) => {
    e.preventDefault();
    consultarTicket(ticketInput);
  };

  // Helper para normalizar el estado del flujo en 4 etapas
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
    return 1; // en diagnóstico o recibido
  };

  const currentStep = reparacion ? getStepStatus(reparacion.estado) : 1;

  // Normalización de campos financieros y de texto compatibles con cualquier esquema
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
    const shareUrl = `${window.location.origin}/rastreo?recibo=${encodeURIComponent(
      reparacion.numero_recibo
    )}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-slate-950">
      {/* Barra de Navegación Pública */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link
            href="/tienda"
            className="flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-amber-400 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver a la Tienda</span>
          </Link>

          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20">
              <Clock className="w-4 h-4" />
            </div>
            <div className="hidden sm:block text-left">
              <span className="font-extrabold text-sm tracking-tight text-white block leading-none">
                CENTRO TÉCNICO RELOJERO
              </span>
              <span className="text-[10px] text-amber-400 font-medium tracking-widest uppercase">
                Portal de Seguimiento
              </span>
            </div>
          </div>

          <a
            href={TALLER_KNOWLEDGE.empresa.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-emerald-400 border border-slate-800 hover:border-emerald-500/30 px-3 py-1.5 rounded-xl bg-slate-900/60 transition-all"
          >
            <PhoneCall className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">WhatsApp Taller</span>
          </a>
        </div>
      </header>

      {/* Contenido Principal */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-10 sm:py-14 space-y-8">
        {/* Cabecera / Hero */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold tracking-wide uppercase">
            <Sparkles className="w-3.5 h-3.5" />
            Atención al Cliente en Vivo
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Seguimiento de Reparación
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Ingresa el número de recibo que aparece en tu comprobante para conocer la etapa exacta de tu reloj en nuestro taller.
          </p>
        </div>

        {/* Formulario de Búsqueda */}
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
              className="w-full pl-12 pr-4 py-3 bg-slate-950 border border-slate-800 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 rounded-xl text-white placeholder-slate-500 text-sm outline-none transition-all disabled:opacity-50"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !ticketInput.trim()}
            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold px-7 py-3 rounded-xl transition-all shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
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

        {/* Mensaje de Error / No Encontrado */}
        {errorMsg && (
          <div className="bg-rose-950/40 border border-rose-500/30 text-rose-300 p-5 rounded-2xl flex items-start gap-3.5 text-sm animate-in fade-in slide-in-from-top-2">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-rose-200">No encontramos tu recibo</p>
              <p className="text-rose-300/90 leading-relaxed">{errorMsg}</p>
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

        {/* Estado Vacío / Ayuda Inicial */}
        {!busquedaRealizada && !reparacion && (
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-6 sm:p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-slate-800/80 border border-slate-700/60 flex items-center justify-center mx-auto text-amber-400">
              <HelpCircle className="w-6 h-6" />
            </div>
            <div className="max-w-md mx-auto space-y-1.5">
              <h3 className="text-sm font-semibold text-white">¿Dónde encuentro mi número de recibo?</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Está impreso en la parte superior derecha de la boleta de servicio que te entregamos al recibir tu pieza en nuestro taller. También puedes consultarlo a través del chatbot inteligente en la tienda.
              </p>
            </div>
          </div>
        )}

        {/* Tarjeta de Información de la Reparación Localizada */}
        {reparacion && (
          <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-7 animate-in fade-in slide-in-from-bottom-4">
            
            {/* Header del Ticket */}
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

                <h2 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2 pt-1">
                  #{reparacion.numero_recibo}
                  <span className="text-amber-400 font-medium text-xl sm:text-2xl">
                    • {reparacion.marca}
                  </span>
                </h2>

                <p className="text-xs text-slate-400">
                  Cliente:{' '}
                  <span className="text-slate-200 font-semibold">
                    {reparacion.clientes?.nombre_completo || 'Cliente Registrado'}
                  </span>
                </p>
              </div>

              {/* Badge de Estado Principal */}
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

            {/* Stepper Visual de 4 Etapas */}
            <div className="py-2">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  Línea de Tiempo del Servicio
                </h3>
                <span className="text-xs text-amber-400/90 font-medium">
                  Paso {currentStep} de 4
                </span>
              </div>

              <div className="relative">
                {/* Barra conectora de fondo */}
                <div className="absolute top-4 left-6 right-6 h-1 bg-slate-800 -z-0 rounded-full hidden sm:block"></div>
                {/* Barra conectora de avance */}
                <div
                  className="absolute top-4 left-6 h-1 bg-gradient-to-r from-amber-500 to-emerald-400 -z-0 rounded-full hidden sm:block transition-all duration-500"
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
                  {/* Etapa 1 */}
                  <div className="flex flex-col items-center text-center">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs mb-2 z-10 transition-all ${
                        currentStep >= 1
                          ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                          : 'bg-slate-800 text-slate-500 border border-slate-700'
                      }`}
                    >
                      {currentStep > 1 ? <CheckCircle2 className="w-5 h-5 text-slate-950" /> : '1'}
                    </div>
                    <span className="text-xs font-semibold text-slate-200">Recepción</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Diagnóstico inicial</span>
                  </div>

                  {/* Etapa 2 */}
                  <div className="flex flex-col items-center text-center">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs mb-2 z-10 transition-all ${
                        currentStep >= 2
                          ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                          : 'bg-slate-800 text-slate-500 border border-slate-700'
                      }`}
                    >
                      {currentStep > 2 ? <CheckCircle2 className="w-5 h-5 text-slate-950" /> : '2'}
                    </div>
                    <span className="text-xs font-semibold text-slate-200">Mesa de Trabajo</span>
                    <span className="text-[10px] text-slate-400 mt-0.5">Taller en proceso</span>
                  </div>

                  {/* Etapa 3 */}
                  <div className="flex flex-col items-center text-center">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs mb-2 z-10 transition-all ${
                        currentStep >= 3
                          ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-400/50'
                          : 'bg-slate-800 text-slate-500 border border-slate-700'
                      }`}
                    >
                      {currentStep > 3 ? <CheckCircle2 className="w-5 h-5 text-slate-950" /> : '3'}
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

                  {/* Etapa 4 */}
                  <div className="flex flex-col items-center text-center">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs mb-2 z-10 transition-all ${
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

            {/* Banner Destacado si está Listo para Entrega */}
            {currentStep === 3 && (
              <div className="bg-emerald-950/40 border border-emerald-500/40 p-4 sm:p-5 rounded-2xl flex items-start gap-4 animate-in fade-in">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 text-emerald-400">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-emerald-300">
                    ¡Tu reloj está completado y listo para retiro!
                  </h4>
                  <p className="text-xs text-emerald-200/90 leading-relaxed">
                    Puedes pasar por nuestro taller ubicado en{' '}
                    <strong className="text-white">{TALLER_KNOWLEDGE.empresa.ubicacion}</strong>.
                    Recuerda presentar tu boleta o comprobante al retirar tu pieza.
                  </p>
                </div>
              </div>
            )}

            {/* Ficha de Detalles Técnicos y Económicos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/60 p-5 rounded-2xl border border-slate-800/90 text-sm">
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
                  <p className="text-amber-400 font-medium mt-1">
                    Revisión #{reparacion.veces_garantia} bajo garantía oficial
                  </p>
                </div>
              ) : null}

              {/* Desglose Financiero */}
              <div className="pt-2 sm:pt-0">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Presupuesto Total
                </p>
                <p className="text-slate-100 font-semibold text-base mt-1">
                  ${presupuestoTotal.toFixed(2)} USD
                </p>
              </div>

              <div className="pt-2 sm:pt-0">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Saldo Pendiente a la Entrega
                </p>
                <p
                  className={`text-base font-extrabold mt-1 ${
                    saldoPendiente > 0 ? 'text-amber-400' : 'text-emerald-400'
                  }`}
                >
                  {saldoPendiente > 0 ? `$${saldoPendiente.toFixed(2)} USD` : 'Totalmente Cancelado'}
                </p>
              </div>
            </div>

            {/* Pie de Ayuda Directa WhatsApp */}
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
      </main>

      {/* Footer Público */}
      <footer className="mt-auto py-8 px-4 sm:px-6 bg-slate-950 border-t border-slate-900 text-xs text-slate-500">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div>
            <p className="text-slate-400 font-medium">{TALLER_KNOWLEDGE.empresa.nombre}</p>
            <p className="text-[11px] text-slate-600 mt-0.5">{TALLER_KNOWLEDGE.empresa.ubicacion}</p>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <Link href="/tienda" className="hover:text-amber-400 transition-colors">
              Tienda y Catálogo
            </Link>
            <span>•</span>
            <Link href="/login" className="hover:text-amber-400 transition-colors">
              Acceso ERP Taller
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function RastreoPublicoPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
          <div className="flex items-center gap-3">
            <Clock className="w-6 h-6 animate-spin text-amber-400" />
            <span className="text-sm font-medium text-slate-400">Cargando portal de rastreo...</span>
          </div>
        </div>
      }
    >
      <RastreoContent />
    </Suspense>
  );
}

