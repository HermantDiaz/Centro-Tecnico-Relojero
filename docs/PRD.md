# ⌚ PRD: Sistema Administrativo RELOJERÍA IA

**Estado:** Versión 1.1 (Modernizada)  
**Documento de Referencia:** [Matriz de Trazabilidad (RTM)](file:///d:/Proyecto%20IA/RELOJERIA%20IA/docs/RTM.md)

---

## 🎯 1. Resumen Ejecutivo
Digitalizar y automatizar la gestión operativa de CTR Relojería, resolviendo la fragmentación de datos en inventario, reparaciones y finanzas mediante una plataforma centralizada basada en la nube.

## 📈 2. KPIs (Indicadores Clave de Desempeño)
| KPI | Meta (6 meses) |
| :--- | :--- |
| **Búsqueda de Stock** | Reducción del 80% en tiempo de consulta. |
| **Exactitud de Caja** | 100% de coincidencia entre sistema y efectivo. |
| **Tiempo de Reparación** | Visibilidad del 100% en cuellos de botella del taller. |
| **Retención de Clientes** | Trazabilidad total de garantías para soporte post-venta. |

## 📋 3. Catálogo Detallado de Requerimientos

### 3.1. Requerimientos Funcionales (FUN)
| ID | Nombre | Descripción | Actores | Prioridad | Criterios de Aceptación |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **REQ-FUN-001** | Autenticación | Inicio de sesión seguro vía Email y Password. | Todos | Crítica | Acceso concedido solo a usuarios registrados; redirección automática al dashboard. |
| **REQ-FUN-002** | Gestión de Inventario | CRUD completo de productos (Relojes, Repuestos). | Admin, Recepción | Alta | Los cambios se reflejan en tiempo real; validación de campos obligatorios. |
| **REQ-FUN-003** | Control de Stock | Alertas visuales automáticas cuando el stock es ≤ stock_minimo. | Todos | Alta | Badge "REABASTECER" visible; cálculo automático en el dashboard. |
| **REQ-FUN-004** | Valoración de Activos | Cálculo automático del valor de compra y venta total del stock. | Admin | Media | Suma total visible en la cabecera del inventario y dashboard administrativo. |
| **REQ-FUN-005** | Gestión de Equipo | Administración de perfiles de usuario y estados de cuenta. | Admin | Alta | El Admin puede activar/desactivar usuarios; no puede desactivarse a sí mismo. |

### 3.2. Requerimientos No Funcionales (NFC)
| ID | Nombre | Descripción | Actores | Prioridad | Criterios de Aceptación |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **REQ-NFC-001** | Diseño Responsivo | La interfaz debe adaptarse a móviles y tablets. | Todos | Alta | Sidebar se convierte en menú hamburguesa en pantallas < 768px. |
| **REQ-NFC-002** | Modo Oscuro Dinámico | Soporte automático para temas claros y oscuros (System Preference). | Todos | Media | Cambio de colores inmediato sin recarga de página; scrollbars personalizados. |
| **REQ-NFC-003** | Estética Premium | Uso de micro-animaciones y efectos de "Glassmorphism". | Todos | Media | Transiciones suaves al navegar y hover en tarjetas de estadísticas. |
| **REQ-NFC-004** | Tiempo de Respuesta | Carga inicial y navegación fluida. | Todos | Alta | Pantalla de carga (Splash) con branding; navegación interna < 200ms. |

### 3.3. Requerimientos de Sistema (SYS)
| ID | Nombre | Descripción | Actores | Prioridad | Criterios de Aceptación |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **REQ-SYS-001** | Persistencia Supabase | Sincronización bidireccional con PostgreSQL. | Sistema | Crítica | Datos persistentes tras cierre de sesión o refresco de navegador. |
| **REQ-SYS-002** | App Router Next.js | Uso de la arquitectura App Router de Next.js 15. | Sistema | Alta | Rutas optimizadas y carga diferida (Lazy Loading) de módulos. |

### 3.4. Requerimientos de Usuario (USR)
| ID | Nombre | Descripción | Actores | Prioridad | Criterios de Aceptación |
| :--- | :--- | :---: | :--- | :---: | :--- |
| **REQ-USR-001** | Privacidad Financiera | Restricción de datos monetarios sensibles a no-admins. | Técnico, Recepcionista | Crítica | Gráficos de ingresos y deudas invisibles para roles operativos. |
| **REQ-USR-002** | Panel Operativo | Interfaz simplificada para técnicos enfocada en taller. | Técnico | Media | Botones de creación/eliminación de productos ocultos para el técnico. |

### 3.5. Requerimientos de Dominio (DOM)
| ID | Nombre | Descripción | Actores | Prioridad | Criterios de Aceptación |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **REQ-DOM-001** | Unicidad de SKU | El código de producto no puede repetirse en el inventario. | Sistema | Alta | Alerta de error si se intenta registrar un SKU ya existente en la DB. |
| **REQ-DOM-002** | Integridad de Precios | Los precios deben ser positivos (≥ 0) y admitir dos decimales. | Sistema | Alta | Validación en el formulario de ingreso; soporte para moneda local. |

---

## 🛠️ 4. Requerimientos de Reparaciones (En Desarrollo)
*(Estos requerimientos se detallarán con IDs REP-XXX en la siguiente fase operativa).*

## ⚠️ 5. Riesgos y Mitigación
... (resto del documento)
