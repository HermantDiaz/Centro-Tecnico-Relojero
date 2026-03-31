# ⌚ PRD: Sistema Administrativo RELOJERÍA IA

**Estado:** Versión 1.2 (Estabilizada & Profesionalizada)  
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
| **REQ-FUN-006** | Monitoreo de Carga | Visualización de reparaciones pendientes por técnico para balance de taller. | Admin | Media | Dashboard de carga visible en el módulo de reparaciones con conteo dinámico. |
| **REQ-FUN-007** | Historial de Eventos | Registro de auditoría para cada cambio de estado o nota en una reparación. | Todos | Alta | Botón de "Historial" que despliega un modal con la traza de eventos y autor. |
| **REQ-FUN-008** | Integración de Insumos | Capacidad de descontar repuestos del inventario al aplicarlos a una reparación. | Técnico, Admin | Alta | Selección de insumos desde el inventario; actualización automática de stock al vincular. |
| **REQ-FUN-009** | Gestión de Garantías | Identificación automática de re-ingresos para control de calidad. | Todos | Alta | Campo "Veces en Garantía" visible; alertas si el ticket es reincidente. |
| **REQ-FUN-010** | Cierre de Caja Diario | Proceso mandatorio de arqueo y cierre al finalizar el día operativo. | Admin, Recepción | Crítica | El sistema no permite iniciar nueva jornada sin realizar el cierre anterior. |
| **REQ-FUN-011** | Registro Transaccional | Categorización de Ingresos y Egresos (Insumos, Gastos, Ventas). | Admin, Recepción | Alta | Trazabilidad de cada dólar que entra o sale con causa y usuario responsable. |

### 3.2. Requerimientos No Funcionales (NFC)
| ID | Nombre | Descripción | Actores | Prioridad | Criterios de Aceptación |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **REQ-NFC-001** | Diseño Responsivo | La interfaz debe adaptarse a móviles y tablets. | Todos | Alta | Sidebar se convierte en menú hamburguesa en pantallas < 768px. |
| **REQ-NFC-002** | Modo Oscuro Dinámico | Soporte automático para temas claros y oscuros (System Preference). | Todos | Media | Cambio de colores inmediato sin recarga de página; scrollbars personalizados. |
| **REQ-NFC-003** | Estética Premium | Uso de micro-animaciones y efectos de "Glassmorphism". | Todos | Media | Transiciones suaves al navegar y hover en tarjetas de estadísticas. |
| **REQ-NFC-004** | Tiempo de Respuesta | Carga inicial y navegación fluida. | Todos | Alta | Pantalla de carga (Splash) con branding; navegación interna < 200ms. |
| **REQ-NFC-005** | Estabilidad de Hidratación | Prevención de errores de renderizado entre servidor y cliente (SSR/CSR). | Sistema | Crítica | Uso mandatorio de `mounted guards` en componentes interactivos complejos. |

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
| **REQ-USR-003** | Acciones Masivas | Selección y procesamiento múltiple de registros en tablas. | Admin, Recepción | Media | Capacidad de eliminar o cambiar estados a múltiples reparaciones simultáneamente. |
| **REQ-USR-004** | Ficha de Perfil de Cliente | Vista consolidada de historial y balance desde el directorio. | Todos | Alta | Modal detalle con todas las reparaciones pasadas y saldo total adeudado. |

### 3.5. Requerimientos de Dominio (DOM)
| ID | Nombre | Descripción | Actores | Prioridad | Criterios de Aceptación |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **REQ-DOM-001** | Unicidad de SKU | El código de producto no puede repetirse en el inventario. | Sistema | Alta | Alerta de error si se intenta registrar un SKU ya existente en la DB. |
| **REQ-DOM-002** | Integridad de Precios | Los precios deben ser positivos (≥ 0) y admitir dos decimales. | Sistema | Alta | Validación en el formulario de ingreso; soporte para moneda local. |

### 3.6. Requerimientos de Seguridad (SEC)
| ID | Nombre | Descripción | Actores | Prioridad | Criterios de Aceptación |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **REQ-SEC-001** | Row Level Security (RLS) | Políticas en la DB para restringir acceso a nivel de fila según el `user_id` o `role`. | Sistema | Crítica | Ninguna consulta externa puede leer datos sin un JWT válido y permisos de rol asociados. |
| **REQ-SEC-002** | Cifrado en Tránsito (SSL) | Garantía de que toda la comunicación entre cliente y servidor es vía HTTPS. | Sistema | Alta | Redirección automática de HTTP a HTTPS en todos los endpoints de la App y API. |
| **REQ-SEC-003** | Gestión de Sesión | Expiración de tokens de acceso y renovación segura (JWT Refresh). | Sistema | Media | El usuario es redirigido al login tras un periodo de inactividad prolongado (config Supabase). |
| **REQ-SEC-004** | Protección CSRF/XSS | Prevención de ataques mediante el uso de frames seguros y saneamiento de inputs. | Sistema | Alta | Uso de `cookies httpOnly` y políticas de seguridad de contenido (CSP) por defecto de Next.js. |

### 3.7. Requerimientos de Fiabilidad y Mantenimiento (REL)
| ID | Nombre | Descripción | Actores | Prioridad | Criterios de Aceptación |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **REQ-REL-001** | Backup Automático | Copias de seguridad diarias de la base de datos PostgreSQL. | Sistema | Alta | Capacidad de restauración a un punto en el tiempo (PITR) de hasta 7 días. |
| **REQ-REL-002** | Alta Disponibilidad | Garantía de tiempo en línea superior al 99.9%. | Sistema | Media | El sistema debe estar accesible sin interrupciones críticas durante el horario comercial. |

---

## 🛠️ 4. Requerimientos de Reparaciones (REP)

| ID | Nombre | Descripción | Actores | Prioridad | Criterios de Aceptación |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **REQ-REP-001** | Registro de Clientes | Base de datos de clientes vinculada a las reparaciones. | Todos | Alta | Búsqueda por nombre/teléfono; validación de duplicados. |
| **REQ-REP-002** | Ficha del Reloj | Registro de Marca, Modelo, Tipo y Serial (si aplica). | Todos | Crítica | Mantenimiento de la estructura histórica de Google Sheets. |
| **REQ-REP-003** | Ciclo de Vida | Flujo de estados con fechas de compromiso, fin y entrega. | Todos | Crítica | Trazabilidad de tiempos de respuesta del taller. |
| **REQ-REP-004** | Control de Abonos | Registro de anticipos y cálculo automático de saldo. | Recepción | Alta | El saldo se actualiza al registrar abonos; validación de total vs saldo. |
| **REQ-REP-005** | Ticket de Servicio | Generación de comprobante basado en el "Número de Recibo". | Recepción | Alta | El número de recibo debe ser coincidente con el sistema actual. |
| **REQ-REP-006** | Notas e Historial | Registro de notas internas y contador de veces en garantía. | Técnico | Media | Identificación de reparaciones recurrentes para control de calidad. |

---

## ⚠️ 5. Riesgos y Mitigación
- **Riesgo:** Pérdida de conectividad a internet en el local.
  - *Mitigación:* Implementar persistencia local (WIP) o usar hotspot 4G.
- **Riesgo:** Reclamos de clientes por daños previos no registrados.
  - *Mitigación:* Obligatoriedad de REQ-REP-002 (Estado Físico) al recibir el reloj.
- **Riesgo:** Errores en cálculos financieros de abonos.
  - *Mitigación:* Validación estricta en base de datos (Saldo = Total - Abonos).
