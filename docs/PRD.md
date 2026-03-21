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

## 📦 3. Requerimientos de Inventario (INV)
| ID | Descripción | Prioridad |
| :--- | :--- | :---: |
| **REQ-INV-001** | Categorización dinámica de artículos (Nuevos, Usados, Repuestos). | Alta |
| **REQ-INV-002** | Registro de SKU/Código único por producto para búsqueda rápida. | Alta |
| **REQ-INV-003** | Sistema de alertas de "Stock Bajo" configurable por artículo. | Alta |
| **REQ-INV-004** | Valoración automática del inventario (Precio Compra * Stock). | Media |
| **REQ-INV-005** | Marcado de productos como "No Vendibles" (uso interno taller). | Media |

## 🛠️ 4. Requerimientos de Reparaciones (REP)
| ID | Descripción | Prioridad |
| :--- | :--- | :---: |
| **REQ-REP-001** | Generación de ticket digital de recepción con datos del cliente y reloj. | Crítica |
| **REQ-REP-002** | Flujo de estados (Recibido → En Diagnóstico → Reparado → Entregado). | Crítica |
| **REQ-REP-003** | Registro de abonos y saldos pendientes por reparación. | Alta |
| **REQ-REP-004** | Historial técnico de fallas por número de recibo. | Media |

## 💰 5. Requerimientos Financieros (FIN)
| ID | Descripción | Prioridad |
| :--- | :--- | :---: |
| **REQ-FIN-001** | Registro de ingresos (ventas/reparaciones) y egresos (gastos). | Alta |
| **REQ-FIN-002** | Dashboard con flujo de caja diario y mensual. | Alta |
| **REQ-FIN-003** | Control de Deudas: Cuentas por Cobrar (Clientes) y Pagar (Prov). | Alta |

## 🔐 6. Requerimientos de Seguridad (SEC)
| ID | Descripción | Prioridad |
| :--- | :--- | :---: |
| **REQ-SEC-001** | Autenticación de usuarios mediantes Supabase Auth. | Crítica |
| **REQ-SEC-002** | Control de acceso basado en roles (Admin, Técnico, Recepcionista). | Crítica |
| **REQ-SEC-003** | Desactivación de cuentas de personal sin pérdida de historial. | Media |

## ⚠️ 7. Riesgos y Mitigación
- **Riesgo:** Pérdida de conectividad a internet en el local.
  - *Mitigación:* Implementar persistencia local (WIP) o usar hotspot 4G.
- **Riesgo:** Carga masiva de inventario manual tediosa.
  - *Mitigación:* Próxima fase: Importación vía CSV/Excel.
