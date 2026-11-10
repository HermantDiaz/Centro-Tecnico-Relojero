# 📋 Matriz de Trazabilidad de Requerimientos (RTM)

Este documento rastrea el cumplimiento de todos los requerimientos definidos en el [PRD v3.0](file:///d:/Proyecto%20IA/RELOJERIA%20IA/docs/PRD.md) a través de los módulos del ERP, la plataforma pública B2C y el motor de Inteligencia Artificial.

---

## 🧩 1. Trazabilidad de Módulos ERP y POS (`apps/admin` & `packages/database`)

| ID Req | Módulo / Archivo de Implementación | Estado | Validación Técnica |
| :--- | :--- | :---: | :--- |
| **REQ-FUN-001** | `src/components/AuthProvider.tsx`, `src/app/login/page.tsx` | ✅ | Flujo de login con Supabase Auth y registro de evento `LOGIN` en `auditoria_logs`. |
| **REQ-FUN-002** | `src/app/inventario/page.tsx` | ✅ | CRUD completo de productos, categorías e importación/exportación CSV (`papaparse`). |
| **REQ-FUN-003** | `src/app/inventario/page.tsx`, `src/app/page.tsx` | ✅ | Badge "REABASTECER" y contador de `stockBajo` en el Dashboard principal. |
| **REQ-FUN-004** | `src/app/inventario/page.tsx`, `src/app/page.tsx` | ✅ | Cálculo automático de valuación de inventario (`precio_compra * stock_actual`). |
| **REQ-FUN-005** | `src/app/admin/usuarios/page.tsx`, `src/components/AuthProvider.tsx` | ✅ | Gestión de roles (`admin`, `recepcion`, `tecnico`) y cierre forzado si `activo = false`. |
| **REQ-FUN-006** | `src/app/reparaciones/page.tsx` | ✅ | Panel de carga de trabajo por técnico especialista. |
| **REQ-FUN-007** | `src/hooks/useAudit.ts`, `src/app/reparaciones/page.tsx` | ✅ | Hook `useAudit` registrando eventos inmutables en tabla `auditoria_logs`. |
| **REQ-FUN-008** | `src/app/reparaciones/page.tsx`, `src/app/caja/page.tsx` | ✅ | Descuento de repuestos e insumos de inventario al vincularlos a taller o venta POS. |
| **REQ-FUN-009** | `src/app/reparaciones/page.tsx`, `src/app/rastreo/page.tsx` | ✅ | Contador `veces_garantia` visible en gestión interna y en portal público. |
| **REQ-FUN-010** | `src/app/caja/page.tsx`, `src/hooks/useCaja.ts` | ✅ | Apertura y cierre de turno (`openCaja`, `closeCaja`) con cálculo de diferencia y arqueo físico. |
| **REQ-FUN-011** | `src/app/caja/page.tsx`, `src/components/caja/ComprobantePago.tsx` | ✅ | Registro de ingresos/egresos/traslados y emisión de comprobante. |
| **REQ-FUN-012** | `src/app/reportes/page.tsx`, `src/app/page.tsx` | ✅ | Rankings de ingresos/egresos y métricas P&L depuradas con `filtrarMovimientosValidos`. |
| **REQ-FUN-013** | `src/app/ajustes/page.tsx`, `src/hooks/useSettings.tsx` | ✅ | Sincronización Realtime de `empresa_config` en todas las sesiones activas. |
| **REQ-FUN-014** | `src/app/ajustes/page.tsx` | ✅ | Previsualización interactiva en vivo del formato de recibo. |
| **REQ-FUN-015** | `src/components/caja/ComprobantePago.tsx` | ✅ | Impresión nativa formateada con tabla de detalles, subtotal, descuento y total. |
| **REQ-FUN-016** | `src/app/reportes/page.tsx`, `src/app/caja/page.tsx` | ✅ | Drill-down de artículos vendidos mediante relación con `caja_movimientos_detalles`. |
| **REQ-FUN-017** | `src/app/reportes/page.tsx` | ✅ | Cálculo comparativo de variación porcentual respecto al periodo anterior. |
| **REQ-FUN-018** | `src/app/reportes/page.tsx` | ✅ | Filtro histórico por mes y año con recálculo reactivo de indicadores. |
| **REQ-FUN-019** | `src/app/reparaciones/page.tsx`, `src/hooks/useCaja.ts` | ✅ | Validación de sesión de caja activa antes de procesar cobros o movimientos. |
| **REQ-FUN-020** | `src/app/caja/page.tsx`, `src/hooks/useCaja.ts` | ✅ | Carrito POS con detalle de ítems y cálculo automático de comisión POS (4%). |
| **REQ-FUN-021** | `src/hooks/useCaja.ts`, `src/app/caja/page.tsx` | ✅ | Enrutamiento a `Efectivo`, `BAC`, `LAFISE`, `BANPRO`, `POS` con validación de saldo previo a egresos. |
| **REQ-FUN-022** | `src/app/reportes/page.tsx` | ✅ | Exportación de estado de resultados P&L y auditoría forense de turnos. |

---

## 🌐 2. Trazabilidad de Plataforma Pública B2C (`apps/web`)

| ID Req | Módulo / Archivo de Implementación | Estado | Validación Técnica |
| :--- | :--- | :---: | :--- |
| **REQ-B2C-001** | `src/app/rastreo/page.tsx` | ✅ | Búsqueda pública por recibo o query param (`?recibo=`), stepper de 4 pasos y ficha económica/técnica. |
| **REQ-B2C-002** | `src/app/rastreo/page.tsx` | ✅ | Botón de copia de enlace al portapapeles y enlace directo a WhatsApp con número de orden. |
| **REQ-B2C-003** | `src/app/tienda/page.tsx` | ✅ | Landing comercial B2C con catálogo preliminar, servicios certificados y acceso a rastreo y ERP. |

---

## 🤖 3. Trazabilidad de Inteligencia Artificial y Chatbot RAG (`packages/ai-engine` & `packages/ui`)

| ID Req | Módulo / Archivo de Implementación | Estado | Validación Técnica |
| :--- | :--- | :---: | :--- |
| **REQ-IA-001** | `src/components/ChatWidget.tsx` | ✅ | Widget flotante interactivo con estado de carga, chips de consulta rápida y reinicio de conversación. |
| **REQ-IA-002** | `src/app/api/chat/route.ts` | ✅ | Extracción de recibo en historial reciente y consulta en tiempo real a `reparaciones` y `clientes` en Supabase. |
| **REQ-IA-003** | `src/lib/tallerKnowledge.ts`, `src/app/api/chat/route.ts` | ✅ | Inyección de tarifas, horarios, ubicación en Managua, marcas y políticas de garantía en el System Prompt. |
| **REQ-IA-004** | `src/app/api/chat/route.ts` | ✅ | Inferencia con `thinkingBudget: 0`, timeout de 8s (`AbortController`) y fallback automático entre modelos Gemini. |
| **REQ-IA-005** | `src/app/api/chat/route.ts` | ✅ | Reglas estrictas anti-alucinación en recibos y guardrails contra Prompt Injection o temas fuera del negocio. |

---

## 🛡️ 4. Trazabilidad No Funcional, Sistema, Seguridad y Dominio

| ID Req | Módulo / Archivo de Implementación | Estado | Validación Técnica |
| :--- | :--- | :---: | :--- |
| **REQ-NFC-001** | `src/app/layout.tsx`, `src/components/Sidebar.tsx`, vistas B2C | ✅ | Diseño adaptable móvil/desktop en ERP, tienda, rastreo y widget de chat. |
| **REQ-NFC-002** | `src/app/globals.css`, `src/app/layout.tsx` | ✅ | Soporte Light/Dark en ERP (`ThemeProvider`) y tema Dark Luxury en vistas B2C. |
| **REQ-NFC-003** | Todas las vistas (`src/app/**`, `src/components/**`) | ✅ | Estados interactivos, animaciones de entrada y feedback de carga. |
| **REQ-NFC-004** | `src/lib/supabase.ts`, `src/components/AuthProvider.tsx` | ✅ | Protocolo `TITAN-IMMUNE` con `atomicStorage` y `SINGLETON` en suscripción de sesión. |
| **REQ-NFC-005** | `src/app/rastreo/page.tsx`, `src/components/Sidebar.tsx` | ✅ | Uso de `<Suspense>` para `useSearchParams` y control de montaje en cliente. |
| **REQ-SYS-001** | `src/lib/supabase.ts` | ✅ | Conexión centralizada a PostgreSQL en Supabase. |
| **REQ-SYS-002** | `package.json`, `next.config.ts`, `tsconfig.json` | ✅ | Next.js 16.1.7, React 19.2.3, `reactCompiler: true`, `tsc --noEmit` sin errores. |
| **REQ-SYS-003** | `apps/*`, `packages/*`, `turbo.json`, `package.json` | ✅ | Monorepo Modular implementado (`@relojeria/admin`, `@relojeria/web`, `@relojeria/database`, `@relojeria/ai-engine`, `@relojeria/ui`). |
| **REQ-USR-001** | `src/components/Sidebar.tsx` | ✅ | Filtrado estricto de rutas financieras y administrativas por rol `admin`. |
| **REQ-USR-002** | `src/app/inventario/page.tsx` | ✅ | Restricción de controles de escritura para el rol `tecnico`. |
| **REQ-USR-003** | `src/app/reparaciones/page.tsx` | ✅ | Selección múltiple y acciones por lote en reparaciones. |
| **REQ-USR-004** | `src/app/clientes/page.tsx` | ✅ | Ficha integral de cliente con historial de servicios y saldos. |
| **REQ-DOM-001** | `src/app/inventario/page.tsx` | ✅ | Validación de SKU único en inventario. |
| **REQ-DOM-002** | `src/hooks/useCaja.ts` | ✅ | Validación de montos positivos y verificación de saldo disponible antes de egresar fondos. |
| **REQ-SEC-001** | Supabase PostgreSQL (Políticas RLS) | ✅ | Seguridad a nivel de fila activa en tablas operativas. |
| **REQ-SEC-002** | `src/app/api/chat/route.ts`, `.env.local` | ✅ | `GEMINI_API_KEY` leída exclusivamente en el servidor y protegida fuera del cliente. |
| **REQ-SEC-005** | `src/hooks/useCaja.ts` | ✅ | Detección de fugas fuera de turno en apertura y justificación forense (`justifyShortage`). |
| **REQ-REL-003** | `src/lib/finanzasUtils.ts` | ✅ | Función `filtrarMovimientosValidos` neutralizando pares de movimientos anulados. |
| **REQ-REP-001..005** | `src/app/reparaciones/page.tsx`, `src/app/rastreo/page.tsx`, `src/app/api/chat/route.ts` | ✅ | Ciclo completo de orden de reparación sincronizado entre taller, portal web y chatbot. |
| **REQ-DEU-001** | `src/app/deudas/page.tsx` | ✅ | Gestión de cuentas por cobrar y pagar integrada con tesorería. |

## 🔑 Leyenda de Estados
- ✅ **Completado:** Implementado en código y verificado.
- 🏗️ **En Transición:** En proceso activo de refactorización a Monorepo.
- ⏳ **Pendiente:** Planificado para iteraciones futuras.

---
*Última actualización: Noviembre 2026*
