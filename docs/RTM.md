# 📋 Matriz de Trazabilidad de Requerimientos (RTM)

Este documento rastrea el cumplimiento de los requerimientos definidos en el [PRD](file:///d:/Proyecto%20IA/RELOJERIA%20IA/docs/PRD.md).

## 🧩 Trazabilidad Técnica

## 🧩 Trazabilidad Técnica Detallada

| ID Req | Módulo / Archivo de Implementación | Estado | Validación (Prueba) |
| :--- | :--- | :---: | :--- |
| **REQ-FUN-001** | `AuthProvider.tsx`, `login/page.tsx` | ✅ | Flujo de login exitoso y manejo de errores. |
| **REQ-FUN-002** | `inventario/page.tsx` | ✅ | Verificación de CRUD (Crear, Leer, Editar, Borrar). |
| **REQ-FUN-003** | `inventario/page.tsx` (Lógica UI) | ✅ | Aparición de badge "REABASTECER" por stock bajo. |
| **REQ-FUN-004** | `inventario/page.tsx` (Header Stats) | ✅ | Cálculo exacto de inversión basado en stock. |
| **REQ-FUN-005** | `admin/usuarios/page.tsx` | ✅ | Gestión de perfiles y estados de activación. |
| **REQ-FUN-006** | `reparaciones/page.tsx` | ✅ | Dashboard de carga por técnico funcional. |
| **REQ-FUN-007** | `reparaciones/page.tsx` | ✅ | Modal de historial con logs de auditoría. |
| **REQ-FUN-008** | `reparaciones/page.tsx` | ✅ | Selector de insumos directo desde el inventario. |
| **REQ-FUN-009** | `reparaciones/page.tsx` | ✅ | Contador de garantías y alertas de reincidencia. |
| **REQ-FUN-010** | `finanzas/page.tsx` | 🏗️ | *En fase de diseño de lógica de cierre.* |
| **REQ-FUN-011** | `finanzas/page.tsx` | 🏗️ | *Estructura de transacciones en DB.* |
| **REQ-NFC-001** | `layout.tsx`, `Sidebar.tsx` | ✅ | Cambio a modo móvil en viewport angosto. |
| **REQ-NFC-002** | `globals.css`, `layout.tsx` | ✅ | Sincronización automática con tema del SO. |
| **REQ-NFC-003** | `globals.css`, Clases Tailwind | ✅ | Efectos visuales, degradados y animaciones. |
| **REQ-NFC-004** | `AuthProvider.tsx` (Splash Screen) | ✅ | Pantalla de carga inicial con branding CTR. |
| **REQ-NFC-005** | `Sidebar.tsx`, `LayoutClient.tsx` | ✅ | Implementación de Mounted Guards (Anti-Mismatch). |
| **REQ-SYS-001** | `lib/supabase.ts` | ✅ | Persistencia de datos en PostgreSQL (Supabase). |
| **REQ-SYS-002** | Estructura `/src/app/` | ✅ | Uso correcto de App Router y Server Components. |
| **REQ-USR-002** | `inventario/page.tsx` (Conditional BTNs) | ✅ | Restricción de acciones de escritura a técnicos. |
| **REQ-USR-003** | `reparaciones/page.tsx` | ✅ | Selección múltiple y borrado masivo activado. |
| **REQ-USR-004** | `clientes/page.tsx` | ✅ | Ficha de perfil con historial de reparaciones. |
| **REQ-DOM-001** | `inventario/page.tsx` (Save Logic) | ✅ | Bloqueo de guardado si el SKU ya existe. |
| **REQ-DOM-002** | `inventario/page.tsx` (Form Inputs) | ✅ | Validación de números positivos y decimales. |
| **REQ-REP-001** | `reparaciones/page.tsx` | ✅ | Registro y búsqueda avanzada de clientes. |
| **REQ-REP-002** | `reparaciones/page.tsx` | ✅ | Formulario detallado de reloj y marca. |
| **REQ-REP-003** | `reparaciones/page.tsx` | ✅ | Workflow de estados (Diagnóstico -> Entregado). |
| **REQ-REP-004** | `reparaciones/page.tsx` | ✅ | Registro de abonos y saldo calculado. |
| **REQ-REP-005** | `reparaciones/page.tsx` | ✅ | Ticket de servicio generado (imprimible). |
| **REQ-REP-006** | `reparaciones/page.tsx` | ✅ | Filtros por Fecha, Estado y Morosidad. |
| **REQ-SEC-001** | `ARCHITECTURE.md` (WIP) / Supabase | 🏗️ | *En revision de politicas RLS.* |
| **REQ-SEC-002** | Infraestructura (Vercel/Supabase) | ✅ | Forzado de SSL en todos los dominios. |
| **REQ-SEC-003** | `AuthProvider.tsx` (JWT Config) | ✅ | Expiración de sesión gestionada por Supabase. |
| **REQ-SEC-004** | `lib/supabase.ts` / Next.js | ✅ | Prevención nativa de Inyecciones y XSS. |
| **REQ-REL-001** | Infraestructura (Supabase) | ✅ | Backups diarios automáticos habilitados. |
| **REQ-REL-002** | Infraestructura (Supabase) | ✅ | SLA de disponibilidad del 99.9%. |

## 🔑 Leyenda de Estados
- ✅ **Completado:** Implementado en código y verificado.
- 🏗️ **En Desarrollo:** Parte de la fase actual de construcción.
- ⏳ **Pendiente:** Planificado para versiones futuras.
- 🚫 **Cancelado:** Requerimiento descartado o modificado.

---
*Última actualización: 2026-03-31*
