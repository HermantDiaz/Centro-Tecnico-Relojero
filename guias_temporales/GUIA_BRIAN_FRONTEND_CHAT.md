# 🎨 Guía de Implementación para Brian (Tienda en Línea + Chatbot UI)

**Rol:** Frontend Specialist — Portal de Tienda Online & Chatbot Experience  
**Rama de Git Asignada:** `feature/chat-widget`  
**Entregables:** 
1. `src/components/ChatWidget.tsx` (Componente del Asistente Virtual flotante con IA).
2. `src/app/tienda/page.tsx` (Página de la Tienda en Línea de Centro Técnico Relojero con el Chatbot activo y la vitrina de catálogo "Próximamente").

---

## 📋 Paso 1: Configuración de tu Entorno y Rama

Abre tu terminal en la carpeta del proyecto y ejecuta estos comandos:

```bash
# 1. Asegúrate de estar actualizado con main
git checkout main
git pull origin main

# 2. Crea y pásate a tu rama de trabajo
git checkout -b feature/chat-widget

# 3. Levanta el servidor de desarrollo
npm run dev
```

---

## 🛠️ Paso 2: Crear el Componente `src/components/ChatWidget.tsx`

Crea el archivo `src/components/ChatWidget.tsx` y pega el siguiente código completo:

```tsx
'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Sparkles, Clock, RefreshCw } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export default function ChatWidget({ defaultOpen = false }: { defaultOpen?: boolean }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: '¡Hola! Soy el asistente virtual de **Centro Técnico Relojero**. ⏱️\n\nPuedo ayudarte a consultar el estado de tu reparación en tiempo real (dame tu número de recibo), informarte sobre tarifas de taller o disponibilidad de relojes. ¿En qué puedo ayudarte hoy?',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSubmit = async (e?: React.FormEvent, customPrompt?: string) => {
    if (e) e.preventDefault();
    const textToSend = customPrompt || input.trim();
    if (!textToSend || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!customPrompt) setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('Error al conectar con el servidor');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.reply || 'Disculpa, no pude procesar la respuesta en este momento.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: '⚠️ Lo siento, ocurrió un error de comunicación con el taller. Por favor inténtalo de nuevo en unos segundos.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickQuestion = (question: string) => {
    handleSubmit(undefined, question);
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content: '¡Conversación reiniciada! ¿Qué consulta tienes sobre nuestro taller o catálogo?',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Ventana de Chat */}
      {isOpen && (
        <div className="mb-4 w-[92vw] sm:w-[410px] h-[560px] max-h-[82vh] bg-slate-900 border border-amber-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden backdrop-blur-xl animate-in fade-in slide-in-from-bottom-5 duration-300">
          
          {/* Header del Chat */}
          <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-amber-950/40 p-4 border-b border-amber-500/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-slate-950 font-bold shadow-md shadow-amber-500/20">
                  <Clock className="w-5 h-5 text-slate-950" />
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full"></span>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white flex items-center gap-1.5">
                  Centro Técnico Relojero
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                </h3>
                <p className="text-xs text-slate-400">Asistente Virtual con IA</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleResetChat}
                title="Reiniciar chat"
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Área de Mensajes */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-950/50">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-2.5 max-w-[85%] ${
                  msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-xs ${
                    msg.role === 'user'
                      ? 'bg-amber-500 text-slate-950 font-medium'
                      : 'bg-slate-800 text-amber-400 border border-amber-500/20'
                  }`}
                >
                  {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                <div>
                  <div
                    className={`p-3.5 rounded-2xl text-sm leading-relaxed ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-medium rounded-tr-none shadow-md shadow-amber-500/10'
                        : 'bg-slate-800/90 text-slate-200 border border-slate-700/60 rounded-tl-none whitespace-pre-wrap'
                    }`}
                  >
                    {msg.content}
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 block px-1">
                    {msg.timestamp}
                  </span>
                </div>
              </div>
            ))}

            {/* Indicador de "Escribiendo..." */}
            {isLoading && (
              <div className="flex gap-2.5 max-w-[85%] mr-auto">
                <div className="w-7 h-7 rounded-full bg-slate-800 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="bg-slate-800/90 border border-slate-700/60 p-3.5 rounded-2xl rounded-tl-none flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                  <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                  <span className="w-2 h-2 bg-amber-400 rounded-full animate-bounce"></span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Chips de Preguntas Frecuentes Sugeridas */}
          {messages.length <= 2 && (
            <div className="px-3 py-2 bg-slate-900 border-t border-slate-800 flex gap-1.5 overflow-x-auto no-scrollbar">
              <button
                onClick={() => handleQuickQuestion('¿Cuánto cuesta cambiar una batería?')}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-amber-300 px-2.5 py-1.5 rounded-full whitespace-nowrap border border-amber-500/20 transition-colors cursor-pointer"
              >
                🔋 Precio batería
              </button>
              <button
                onClick={() => handleQuickQuestion('Quiero consultar el estado de mi reloj en reparación')}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-amber-300 px-2.5 py-1.5 rounded-full whitespace-nowrap border border-amber-500/20 transition-colors cursor-pointer"
              >
                🔍 Rastrear orden
              </button>
              <button
                onClick={() => handleQuickQuestion('¿Dónde están ubicados y qué horarios atienden?')}
                className="text-xs bg-slate-800 hover:bg-slate-700 text-amber-300 px-2.5 py-1.5 rounded-full whitespace-nowrap border border-amber-500/20 transition-colors cursor-pointer"
              >
                📍 Ubicación
              </button>
            </div>
          )}

          {/* Formulario de Entrada */}
          <form
            onSubmit={(e) => handleSubmit(e)}
            className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Escribe tu consulta o # de recibo..."
              disabled={isLoading}
              className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 p-2.5 rounded-xl font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-md shadow-amber-500/20 cursor-pointer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Botón Flotante Disparador */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 rounded-full bg-gradient-to-tr from-amber-600 via-amber-500 to-amber-400 text-slate-950 shadow-lg shadow-amber-500/30 flex items-center justify-center hover:scale-105 active:scale-95 transition-all duration-200 group cursor-pointer"
        aria-label="Abrir asistente virtual"
      >
        {isOpen ? (
          <X className="w-6 h-6 text-slate-950 transition-transform duration-200 group-hover:rotate-90" />
        ) : (
          <div className="relative">
            <MessageSquare className="w-6 h-6 text-slate-950" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping"></span>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-500 rounded-full"></span>
          </div>
        )}
      </button>
    </div>
  );
}
```

---

## 🛍️ Paso 3: Crear la Página de la Tienda en Línea `src/app/tienda/page.tsx`

Crea la carpeta y archivo `src/app/tienda/page.tsx` y pega el siguiente código completo. Esta es la fachada B2C de la tienda en línea con sección de vitrina *"Próximamente"*, servicios técnicos, enlace a rastreo y el **Chatbot activo**:

```tsx
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
```

---

## 🧪 Paso 4: Cómo Probarlo y Subir tu Rama

1. En tu navegador entra a: **`http://localhost:3000/tienda`**
2. Verás la página completa de la **Tienda en Línea de Centro Técnico Relojero**, con su barra de navegación, catálogo en modo *"Próximamente"*, tarifas de taller y el **Chatbot abierto y listo para conversar**.
3. Haz clic en los botones de preguntas rápidas o escribe un número de recibo para probar la conexión con el backend de Hermant.

### Subir tus cambios a GitHub:
```bash
git add src/components/ChatWidget.tsx src/app/tienda/page.tsx
git commit -m "feat(tienda): implementar portal de tienda en linea con chatbot IA integrado"
git push -u origin feature/chat-widget
```

¡Avísale a Hermant en Discord cuando hayas hecho el push!
