# 📱 Guía de Implementación para Iván (B2C Tracking & Knowledge Base)

**Rol:** B2C Specialist & Knowledge Engineer  
**Rama de Git Asignada:** `feature/b2c-tracking`  
**Entregables:**
1. `src/lib/tallerKnowledge.ts` (Base de conocimiento oficial del taller para alimentar al bot).
2. `src/app/rastreo/page.tsx` (Página pública de consulta de reparaciones para clientes, sin login).

---

## 📋 Paso 1: Configuración de tu Entorno y Rama

Abre tu terminal en la carpeta del proyecto y ejecuta estos comandos:

```bash
# 1. Asegúrate de estar actualizado con main
git checkout main
git pull origin main

# 2. Crea y pásate a tu rama de trabajo
git checkout -b feature/b2c-tracking

# 3. Levanta el servidor de desarrollo
npm run dev
```
Tu aplicación estará corriendo en `http://localhost:3000`.

---

## 🧠 Paso 2: Crear la Base de Conocimiento `src/lib/tallerKnowledge.ts`

Crea el archivo `src/lib/tallerKnowledge.ts` y pega la siguiente información estructurada de Centro Técnico Relojero:

```typescript
export const TALLER_KNOWLEDGE = {
  empresa: {
    nombre: 'Centro Técnico Relojero',
    ciudad: 'Managua, Nicaragua',
    ubicacion: 'Plaza España, del semáforo 1c al lago, módulo #4, Managua.',
    horario: 'Lunes a Viernes de 8:00 AM a 5:30 PM. Sábados de 8:30 AM a 1:00 PM. Domingos cerrado.',
    telefono: '+505 8888-0000',
    whatsapp: 'https://wa.me/50588880000',
    especialidad: 'Mantenimiento preventivo, restauración, cambio de repuestos suizos y japoneses, calibración y pruebas de hermeticidad.',
  },

  tarifas_estimadas: [
    {
      servicio: 'Cambio de Batería (Pila Suiza Renata / Maxell japonesa)',
      costo: '$5.00 a $10.00 USD (C$180 a C$365)',
      tiempo: '15 a 30 minutos (Express)',
      incluye: 'Revisión básica de empaque y limpieza de contactos.',
    },
    {
      servicio: 'Cambio de Cristal Mineral / Zafiro',
      costo: '$15.00 a $35.00 USD según diámetro y grosor',
      tiempo: '24 a 48 horas',
      incluye: 'Sustitución de cristal, biselado e impermeabilización.',
    },
    {
      servicio: 'Mantenimiento General Automático / Cuerda (Desarme, Lavado y Lubricación)',
      costo: '$35.00 a $70.00 USD según la complejidad del calibre (Seiko, Citizen, ETA, etc.)',
      tiempo: '3 a 5 días hábiles',
      incluye: 'Desarme completo, baño ultrasónico, aceites sintéticos Moebius, calibración en cronocomparador y prueba de hermeticidad.',
    },
    {
      servicio: 'Pulido de Caja y Extensible de Acero',
      costo: '$20.00 a $40.00 USD',
      tiempo: '2 a 3 días hábiles',
      incluye: 'Eliminación de micro-rayas y acabado satinado/brillante original.',
    },
    {
      servicio: 'Ajuste de Eslabones / Extensible',
      costo: '$3.00 a $5.00 USD (Gratis si compró el reloj en tienda)',
      tiempo: 'Inmediato (10 minutos)',
      incluye: 'Ajuste a la medida de muñeca.',
    },
  ],

  politicas_y_garantias: [
    'Toda reparación de maquinaria o cambio de máquina cuenta con 90 días (3 meses) de garantía sobre el trabajo realizado.',
    'Los cambios de batería cuentan con 6 meses de garantía sobre la durabilidad de la carga.',
    'Es indispensable presentar el recibo o comprobante físico/digital al retirar su reloj en el taller.',
    'Relojes no retirados después de 90 días de la fecha promesa pasan a custodia especial según normativas del taller.',
  ],

  marcas_atendidas: [
    'Seiko', 'Citizen', 'Orient', 'Casio / G-Shock', 'Tissot', 'Bulova', 'Fossil', 
    'Swatch', 'Invicta', 'Omega', 'Rolex', 'Longines', 'Tag Heuer', 'Victorinox', 'Festina'
  ],
};
```

---

## 🔍 Paso 3: Crear la Página Pública `src/app/rastreo/page.tsx`

Crea la carpeta y archivo `src/app/rastreo/page.tsx` con el siguiente código completo. Permite a cualquier cliente ingresar su número de recibo y ver el avance exacto sin necesidad de iniciar sesión:

```tsx
'use client';

import React, { useState } from 'react';
import { Search, Clock, CheckCircle2, AlertCircle, Wrench, Package, ArrowRight, ShieldCheck, PhoneCall } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface ReparacionData {
  numero_recibo: string;
  marca: string;
  modelo_descripcion: string;
  estado: string;
  falla_declarada?: string;
  costo_estimado?: number;
  saldo?: number;
  fecha_promesa?: string;
  clientes?: {
    nombre_completo?: string;
  };
}

export default function RastreoPublicoPage() {
  const [ticketInput, setTicketInput] = useState('');
  const [reparacion, setReparacion] = useState<ReparacionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [busquedaRealizada, setBusquedaRealizada] = useState(false);

  const handleBuscar = async (e: React.FormEvent) => {
    e.preventDefault();
    const query = ticketInput.trim();
    if (!query) return;

    setLoading(true);
    setErrorMsg('');
    setReparacion(null);
    setBusquedaRealizada(true);

    try {
      const { data, error } = await supabase
        .from('reparaciones')
        .select(`
          numero_recibo,
          marca,
          modelo_descripcion,
          estado,
          falla_declarada,
          costo_estimado,
          saldo,
          fecha_promesa,
          clientes:cliente_id (nombre_completo)
        `)
        .eq('numero_recibo', query)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setErrorMsg(`No encontramos ninguna orden de reparación registrada con el número de recibo "${query}". Por favor verifica tu recibo o contáctanos por WhatsApp.`);
      } else {
        // En Supabase, si clientes viene como array u objeto, normalizamos
        const clienteData = Array.isArray(data.clientes) ? data.clientes[0] : data.clientes;
        setReparacion({
          ...data,
          clientes: clienteData,
        } as ReparacionData);
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Ocurrió un error al consultar el sistema. Por favor intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // Helper para normalizar el estado en pasos
  const getStepStatus = (estado: string) => {
    const st = (estado || '').toLowerCase();
    if (st.includes('entregado')) return 4;
    if (st.includes('listo')) return 3;
    if (st.includes('repara') || st.includes('taller') || st.includes('repuesto') || st.includes('proceso')) return 2;
    return 1; // en diagnostico / recibido
  };

  const currentStep = reparacion ? getStepStatus(reparacion.estado) : 1;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8">
      {/* Contenedor Central */}
      <div className="max-w-3xl mx-auto space-y-8">
        
        {/* Cabecera */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold tracking-wide uppercase">
            <Clock className="w-3.5 h-3.5" />
            Portal de Clientes
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Seguimiento de Reparación
          </h1>
          <p className="text-slate-400 text-sm sm:text-base max-w-xl mx-auto">
            Consulta en tiempo real el avance de tu reloj en nuestro taller con solo ingresar el número de tu recibo.
          </p>
        </div>

        {/* Formulario de Búsqueda */}
        <form onSubmit={handleBuscar} className="bg-slate-900/90 border border-slate-800 p-3 sm:p-4 rounded-2xl shadow-xl flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              value={ticketInput}
              onChange={(e) => setTicketInput(e.target.value)}
              placeholder="Ingresa tu número de recibo (ej: 1042)..."
              className="w-full pl-12 pr-4 py-3 bg-slate-950 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !ticketInput.trim()}
            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold px-6 py-3 rounded-xl transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {loading ? (
              <span className="flex items-center gap-2 text-sm">Consultando...</span>
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
          <div className="bg-rose-950/40 border border-rose-500/30 text-rose-300 p-4 rounded-xl flex items-start gap-3 text-sm animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-200">Orden no localizada</p>
              <p className="mt-0.5 text-rose-300/90">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Tarjeta de Información de la Reparación */}
        {reparacion && (
          <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-6 sm:p-8 shadow-2xl space-y-6 animate-in fade-in slide-in-from-bottom-4">
            
            {/* Header del Ticket */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
              <div>
                <span className="text-xs text-slate-400 font-mono tracking-wider uppercase">Recibo Oficial</span>
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  #{reparacion.numero_recibo}
                  <span className="text-amber-400 font-normal">| {reparacion.marca}</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Cliente: <span className="text-slate-200 font-medium">{reparacion.clientes?.nombre_completo || 'Cliente Registrado'}</span>
                </p>
              </div>

              {/* Badge de Estado */}
              <div>
                <span className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                  currentStep === 3
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : currentStep === 4
                    ? 'bg-slate-700 text-slate-300'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}>
                  <span className="w-2 h-2 rounded-full bg-current animate-pulse"></span>
                  {reparacion.estado}
                </span>
              </div>
            </div>

            {/* Barra de Progreso / Stepper Visual */}
            <div className="py-2">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">Etapa del Servicio</h3>
              <div className="grid grid-cols-4 gap-2 text-center">
                
                {/* Paso 1 */}
                <div className="flex flex-col items-center">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs mb-1.5 ${
                    currentStep >= 1 ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-500'
                  }`}>
                    1
                  </div>
                  <span className="text-[11px] text-slate-300 font-medium">Diagnóstico</span>
                </div>

                {/* Paso 2 */}
                <div className="flex flex-col items-center">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs mb-1.5 ${
                    currentStep >= 2 ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-500'
                  }`}>
                    2
                  </div>
                  <span className="text-[11px] text-slate-300 font-medium">Mesa Trabajo</span>
                </div>

                {/* Paso 3 */}
                <div className="flex flex-col items-center">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs mb-1.5 ${
                    currentStep >= 3 ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20' : 'bg-slate-800 text-slate-500'
                  }`}>
                    3
                  </div>
                  <span className="text-[11px] text-slate-300 font-medium">Listo</span>
                </div>

                {/* Paso 4 */}
                <div className="flex flex-col items-center">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs mb-1.5 ${
                    currentStep === 4 ? 'bg-slate-600 text-white' : 'bg-slate-800 text-slate-500'
                  }`}>
                    4
                  </div>
                  <span className="text-[11px] text-slate-400">Entregado</span>
                </div>

              </div>
            </div>

            {/* Ficha de Detalles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80 text-sm">
              <div>
                <p className="text-xs text-slate-500 uppercase">Modelo / Descripción</p>
                <p className="text-slate-200 font-medium mt-0.5">{reparacion.modelo_descripcion || 'No especificado'}</p>
              </div>

              <div>
                <p className="text-xs text-slate-500 uppercase">Motivo / Falla Declarada</p>
                <p className="text-slate-200 font-medium mt-0.5">{reparacion.falla_declarada || 'Mantenimiento / Revisión general'}</p>
              </div>

              {reparacion.costo_estimado !== undefined && (
                <div>
                  <p className="text-xs text-slate-500 uppercase">Presupuesto Estimado</p>
                  <p className="text-slate-200 font-medium mt-0.5">${Number(reparacion.costo_estimado).toFixed(2)} USD</p>
                </div>
              )}

              {reparacion.saldo !== undefined && (
                <div>
                  <p className="text-xs text-slate-500 uppercase">Saldo Pendiente</p>
                  <p className="text-amber-400 font-bold mt-0.5">${Number(reparacion.saldo).toFixed(2)} USD</p>
                </div>
              )}
            </div>

            {/* Banner de Retiro */}
            {currentStep >= 3 && currentStep < 4 && (
              <div className="bg-emerald-950/30 border border-emerald-500/30 p-4 rounded-xl flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <p className="text-xs text-emerald-300">
                  ¡Tu pieza está lista! Puedes pasar retirándola en nuestro taller en Plaza España presentando tu recibo físico.
                </p>
              </div>
            )}

            {/* Botón de Ayuda WhatsApp */}
            <div className="pt-2 flex justify-center">
              <a
                href={`https://wa.me/50588880000?text=Hola,%20quisiera%20consultar%20sobre%20mi%20orden%20%23${reparacion.numero_recibo}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs text-slate-400 hover:text-amber-400 transition-colors"
              >
                <PhoneCall className="w-3.5 h-3.5" />
                ¿Tienes dudas sobre esta orden? Escríbenos directamente a WhatsApp
              </a>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
```

---

## 🧪 Paso 4: Cómo Probarlo y Guardar tu Trabajo

1. Abre tu navegador en `http://localhost:3000/rastreo`.
2. Prueba ingresando un número de recibo existente de tu base de datos (por ejemplo, el que tengas en la tabla `reparaciones`).
3. Comprueba que muestre la tarjeta con el estado y la barra de progreso.

### Subir tus cambios a GitHub:
```bash
git add src/lib/tallerKnowledge.ts src/app/rastreo/page.tsx
git commit -m "feat(b2c): implementar pagina publica de rastreo y base de conocimiento del taller"
git push -u origin feature/b2c-tracking
```

¡Excelente trabajo! Cuando termines el push, avisa a Hermant por el canal de voz en Discord para la integración final.
