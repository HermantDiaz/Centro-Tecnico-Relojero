# 📋 Matriz de Trazabilidad de Requerimientos (RTM)

Este documento rastrea el cumplimiento de los requerimientos definidos en el [PRD](file:///d:/Proyecto%20IA/RELOJERIA%20IA/docs/PRD.md).

## 🧩 Trazabilidad Técnica

| ID Requerimiento | Módulo / Archivo de Implementación | Estado | Validación (Prueba) |
| :--- | :--- | :---: | :--- |
| **REQ-INV-001** | `inventario/page.tsx`, `DATABASE.md` | ✅ | Visualización de categorías en tabla y filtros. |
| **REQ-INV-002** | `inventario/page.tsx` (campo `codigo`) | ✅ | Búsqueda por SKU en barra de búsqueda. |
| **REQ-INV-003** | `inventario/page.tsx` (lógica `stock_minimo`) | ✅ | Alertas visuales "REABASTECER" en tabla. |
| **REQ-INV-004** | `inventario/page.tsx` (Badge de Inversión) | ✅ | Cálculo en cabecera de Inventario. |
| **REQ-INV-005** | `inventario/page.tsx` (flag `es_vendible`) | ✅ | Campo presente en el modal de edición. |
| **REQ-REP-001** | `reparaciones/page.tsx` | 🏗️ | *En desarrollo (Fase Taller).* |
| **REQ-REP-002** | `reparaciones/page.tsx` | 🏗️ | *En desarrollo (Fase Taller).* |
| **REQ-FIN-001** | `finanzas/page.tsx` | 🏗️ | *En desarrollo (Fase Caja).* |
| **REQ-SEC-001** | `AuthProvider.tsx`, `lib/supabase.ts` | ✅ | Redirección forzada a `/login`. |
| **REQ-SEC-002** | `Sidebar.tsx`, `layout.tsx` | ✅ | Menú filtrado por rol y protección de rutas. |
| **REQ-SEC-003** | `admin/usuarios/page.tsx` (flag `activo`) | ✅ | Bloqueo de sesión para perfiles inactivos. |

## 🔑 Leyenda de Estados
- ✅ **Completado:** Implementado en código y verificado.
- 🏗️ **En Desarrollo:** Parte de la fase actual de construcción.
- ⏳ **Pendiente:** Planificado para versiones futuras.
- 🚫 **Cancelado:** Requerimiento descartado o modificado.

---
*Última actualización: 2026-03-21*
