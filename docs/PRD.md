# ⌚ PRD: Ecosistema Digital RELOJERÍA IA (ERP/POS + Plataforma B2C + Asistente IA)

**Estado:** Versión 3.0 (ERP/POS Forense, Portal B2C de Rastreo, Tienda Digital y Asistente Virtual IA con RAG/Tool Calling)  
**Documentos de Referencia:** [Matriz de Trazabilidad (RTM)](file:///d:/Proyecto%20IA/RELOJERIA%20IA/docs/RTM.md) | [Arquitectura B2C & RAG](file:///d:/Proyecto%20IA/RELOJERIA%20IA/docs/ARQUITECTURA_B2C_RAG.md)

---

## 🎯 1. Resumen Ejecutivo
Digitalizar, automatizar y escalar la gestión operativa y comercial de **Centro Técnico Relojero (CTR)** en Managua, Nicaragua. El ecosistema resuelve la fragmentación de datos en inventario, taller de reparaciones y finanzas mediante un ERP administrativo blindado, y extiende la atención al cliente hacia una **Plataforma Pública B2C** con seguimiento de órdenes en vivo y un **Asistente Virtual Inteligente (RAG + Tool Calling)** impulsado por Google Gemini y Supabase.

## 📈 2. KPIs (Indicadores Clave de Desempeño)
| KPI | Meta |
| :--- | :--- |
| **Búsqueda de Stock** | Reducción del 80% en tiempo de consulta en mostrador. |
| **Exactitud de Caja** | 100% de coincidencia entre sistema, efectivo físico y cuentas bancarias. |
| **Visibilidad de Taller (B2B y B2C)** | 100% de trazabilidad en tiempo real desde recepción hasta entrega, consultable por el cliente vía web o chatbot. |
| **Atención Automatizada IA** | Respuesta en < 2 segundos (TTFT) a consultas de recibos, tarifas y garantías 24/7 con 0% de alucinación en datos de boletas. |
| **Retención de Clientes** | Trazabilidad total de garantías e historial técnico por cliente. |

---

## 📋 3. Catálogo Detallado de Requerimientos

### 3.1. Requerimientos Funcionales del ERP / POS (FUN)
| ID | Nombre | Descripción | Actores | Prioridad | Criterios de Aceptación |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **REQ-FUN-001** | Autenticación | Inicio de sesión seguro vía Email y Password con Supabase Auth. | Personal | Crítica | Acceso concedido solo a usuarios registrados y activos; redirección automática al dashboard. |
| **REQ-FUN-002** | Gestión de Inventario | CRUD completo de productos (Relojes, Repuestos, Correas, Baterías) e importación/exportación CSV. | Admin, Recepción | Alta | Los cambios se reflejan en tiempo real; validación de campos obligatorios. |
| **REQ-FUN-003** | Control de Stock | Alertas visuales automáticas cuando `stock_actual <= stock_minimo` (excepto `-1`). | Personal | Alta | Badge "REABASTECER" visible; conteo automático en el dashboard. |
| **REQ-FUN-004** | Valoración de Activos | Cálculo automático del valor de compra y venta total del stock. | Admin | Media | Suma total visible en la cabecera del inventario y dashboard administrativo. |
| **REQ-FUN-005** | Gestión de Equipo | Administración de perfiles de usuario, roles (`admin`, `recepcion`, `tecnico`) y estados de cuenta. | Admin | Alta | El Admin puede activar/desactivar usuarios; bloqueo inmediato de sesión si `activo = false`. |
| **REQ-FUN-006** | Monitoreo de Carga | Visualización de reparaciones pendientes por técnico para balance de taller. | Admin | Media | Dashboard de carga visible en el módulo de reparaciones con conteo dinámico. |
| **REQ-FUN-007** | Historial de Eventos | Registro de auditoría (`auditoria_logs`) para acciones sensibles, anulaciones y cambios. | Personal | Alta | Trazabilidad de usuario, módulo, acción y marca de tiempo. |
| **REQ-FUN-008** | Integración de Insumos | Capacidad de descontar repuestos del inventario al aplicarlos a una reparación o venta POS. | Técnico, Admin, Recepción | Alta | Selección de insumos desde el inventario; actualización atómica de stock al vincular. |
| **REQ-FUN-009** | Gestión de Garantías | Identificación automática de re-ingresos para control de calidad (`veces_garantia`). | Personal | Alta | Campo "Veces en Garantía" visible tanto en ERP como en el portal público de rastreo. |
| **REQ-FUN-010** | Cierre de Caja Diario | Proceso mandatorio de arqueo y cierre al finalizar el turno operativo. | Admin | Crítica | El sistema detecta diferencias contra el saldo esperado y exige justificación en caso de faltantes. |
| **REQ-FUN-011** | Registro Transaccional | Categorización de Ingresos, Egresos y Traslados en `caja_movimientos`. | Admin | Alta | Trazabilidad de cada flujo que entra o sale con generación de comprobante imprimible. |
| **REQ-FUN-012** | Inteligencia Financiera Reactiva | Reportes y rankings dinámicos en el Dashboard y Módulo de Reportes. | Admin | Alta | Tarjetas "Top Ingresos/Gastos" e indicadores P&L actualizados dinámicamente y filtrados contra anulaciones (`filtrarMovimientosValidos`). |
| **REQ-FUN-013** | Configuración Global (ERP) | Módulo de Ajustes para personalizar Nombre, Eslogan, Moneda y Pie de Página (`empresa_config`). | Admin | Alta | Sincronización Realtime con Supabase; los cambios aplican instantáneamente en todas las sesiones activas. |
| **REQ-FUN-014** | Previsualización de Recibos | Mockup en vivo de cómo se imprimirá el ticket de caja al cliente. | Admin | Media | Editor en vivo que responde letra a letra a la configuración ingresada en Ajustes. |
| **REQ-FUN-015** | Impresión de Comprobantes | Generación e impresión física/digital de comprobantes de pago (`ComprobantePago.tsx`). | Admin, Recepción | Media | Ventana de impresión limpia con desglose de artículos, subtotal, descuento y método de pago. |
| **REQ-FUN-016** | Auditoría de Drill-Down | Capacidad de desglosar movimientos de caja para ver artículos específicos (`caja_movimientos_detalles`). | Admin | Alta | Cada transacción de venta POS es expansible para visualizar cantidad, descripción y subtotal. |
| **REQ-FUN-017** | Análisis Temporal Comparativo | Visualización de variaciones porcentuales de ingresos/gastos comparando el periodo actual con el anterior. | Admin | Alta | Indicadores de crecimiento/decrecimiento automático en el panel de reportes. |
| **REQ-FUN-018** | Filtro Mensual de BI | Navegación histórica por mes y año para auditoría de rendimiento financiero. | Admin | Alta | Selector de mes/año funcional que recalcula todo el dashboard de reportes instantáneamente. |
| **REQ-FUN-019** | Seguridad de Operación por Caja | Bloqueo preventivo de cobros/abonos si no existe una sesión de caja abierta (`useCaja`). | Recepción, Admin | Crítica | El sistema impide registrar movimientos monetarios si detecta que la caja está cerrada. |
| **REQ-FUN-020** | Sistema POS en Caja | Carrito de compras, selección de inventario, cálculo de comisión POS (4%) y comprobantes detallados. | Admin, Recepción | Alta | Carrito funcional descontando stock y enlazando movimiento de caja con `caja_movimientos_detalles`. |
| **REQ-FUN-021** | Enrutamiento Bancario Directo | Capacidad de seleccionar cuenta destino (`Efectivo`, `BAC`, `LAFISE`, `BANPRO`, `POS`) con validación de fondos. | Admin, Recepción | Alta | Los pagos y egresos validan disponibilidad de saldo en gaveta o cuenta de tesorería (`tesoreria_cuentas`). |
| **REQ-FUN-022** | Exportador PDF P&L | Exportación del estado de resultados (P&L) y auditoría de turnos a formato imprimible/PDF. | Admin | Media | Generación de reporte estructurado con desglose forense del periodo seleccionado. |

---

### 3.2. Requerimientos de Plataforma Pública B2C (B2C) — *Implementados*
| ID | Nombre | Descripción | Actores | Prioridad | Criterios de Aceptación |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **REQ-B2C-001** | Portal Público de Rastreo (`/rastreo`) | Consulta pública de estado de reparación por número de recibo (ej. `1042`, `#1042`, `REP-1042`) o parámetro URL (`?recibo=`). | Cliente B2C | Crítica | Acceso sin login; normalización de prefijos; stepper visual de 4 etapas (Recepción, Mesa de Trabajo, Listo, Entregado); desglose de presupuesto, abono y saldo pendiente. |
| **REQ-B2C-002** | Enlace Compartible y Escalamiento WhatsApp | Capacidad de copiar enlace directo de seguimiento y contactar al taller con mensaje prellenado del recibo. | Cliente B2C | Media | Botón "Compartir enlace" copia URL con `?recibo=`; botón de WhatsApp incluye el número de orden y marca del reloj. |
| **REQ-B2C-003** | Tienda y Vitrina Digital (`/tienda`) | Landing page comercial B2C con estética de alta relojería, vitrina de catálogo, resumen de servicios certificados y acceso directo a rastreo. | Visitante Web | Alta | Navegación pública desacoplada del Sidebar del ERP; embebe el widget del Asistente Virtual activo por defecto. |

---

### 3.3. Requerimientos de Inteligencia Artificial y Chatbot RAG (IA) — *Implementados*
| ID | Nombre | Descripción | Actores | Prioridad | Criterios de Aceptación |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **REQ-IA-001** | Widget Flotante de Asistente Virtual (`ChatWidget.tsx`) | Interfaz conversacional flotante con historial de sesión, indicador de escritura, chips de preguntas frecuentes y botón de reinicio. | Cliente B2C | Alta | Diseño responsivo móvil/desktop en paleta oscura/dorada; scroll automático al último mensaje. |
| **REQ-IA-002** | Tool Calling / RAG Dinámico de Reparaciones (`/api/chat`) | Detección inteligente de número de recibo en el mensaje actual o historial reciente (últimos 5 turnos) y consulta en vivo a Supabase (`reparaciones` + `clientes`). | Sistema IA | Crítica | Inyección de datos oficiales (cliente, marca, modelo, estado explícito, trabajo, presupuesto, abono, saldo exacto y fecha compromiso) con prohibición estricta de inventar datos. |
| **REQ-IA-003** | Base de Conocimiento del Taller (`tallerKnowledge.ts`) | Repositorio estructurado con dirección, horarios, teléfonos, rangos de tarifas por servicio, tiempos estimados, políticas de garantía y marcas atendidas. | Sistema IA | Alta | Respuestas precisas sobre precios de baterías, cristales, mantenimientos automáticos, pulidos y garantías (90 días maquinaria / 6 meses baterías). |
| **REQ-IA-004** | Inferencia de Baja Latencia y Fallback Multi-Modelo | Integración con Google Gemini (`thinkingBudget: 0` para evitar truncamiento y responder en ~1s) con cascada de respaldo entre modelos y timeout de 8s. | Sistema IA | Alta | Si el modelo primario falla o excede el tiempo, reintenta automáticamente con el modelo secundario sin interrumpir la experiencia del usuario. |
| **REQ-IA-005** | Guardrails de Seguridad y Dominio | Protección contra intentos de Prompt Injection / Jailbreak y redirección amable ante preguntas fuera del dominio de relojería. | Sistema IA | Crítica | Ante intentos de extracción de prompts o preguntas ajenas al taller, responde en 1-2 líneas manteniendo su rol oficial en Centro Técnico Relojero. |

---

### 3.4. Requerimientos No Funcionales (NFC) y de Sistema (SYS)
| ID | Nombre | Descripción | Actores | Prioridad | Criterios de Aceptación |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **REQ-NFC-001** | Diseño Responsivo | La interfaz (ERP y B2C) se adapta a móviles, tablets y escritorio. | Todos | Alta | Controles táctiles accesibles y contenedores adaptables en pantallas `< 768px`. |
| **REQ-NFC-002** | Modo Oscuro y Dirección Estética | Soporte de temas claros/oscuros en ERP (`next-themes`) y estética "Dark Luxury" (Slate/Amber) en B2C. | Todos | Media | Contraste disciplinado, jerarquía tipográfica clara y ausencia de patrones genéricos. |
| **REQ-NFC-003** | Micro-interacciones Pulidas | Estados `hover`, `focus`, `active` y transiciones suaves con propósito. | Todos | Media | Feedback visual inmediato en botones, carga de datos y apertura de modales/chat. |
| **REQ-NFC-004** | Tiempo de Respuesta | Carga inicial rápida y estabilidad de sesión (`TITAN-IMMUNE`). | Todos | Alta | Almacenamiento atómico en `sessionStorage` que previene bloqueos de Web Locks en el navegador. |
| **REQ-NFC-005** | Estabilidad de Hidratación | Prevención de errores de renderizado entre servidor y cliente (SSR/CSR) y uso de `Suspense` en rutas con `useSearchParams`. | Sistema | Crítica | Cero errores de hidratación en consola; página `/rastreo` envuelta en boundary `<Suspense>`. |
| **REQ-SYS-001** | Persistencia Unificada Supabase | Sincronización bidireccional con PostgreSQL para ERP, B2C y Chatbot. | Sistema | Crítica | Única fuente de verdad transaccional compartida entre mostrador físico y canales digitales. |
| **REQ-SYS-002** | Next.js 16+ App Router & React Compiler | Uso de App Router, Turbopack y `babel-plugin-react-compiler`. | Sistema | Alta | Compilación optimizada y tipado estricto (`tsc --noEmit` con 0 errores). |
| **REQ-SYS-003** | Arquitectura Monorepo Modular (Turborepo) | Separación estructural en aplicaciones (`apps/admin`, `apps/web`) y paquetes compartidos (`packages/database`, `packages/ai-engine`, `packages/ui`). | Equipo Ingeniería | Alta | Aislamiento de dominios B2B, B2C e IA compartiendo contratos TypeScript de extremo a extremo. |

---

### 3.5. Requerimientos de Usuario (USR), Dominio (DOM), Seguridad (SEC) y Fiabilidad (REL)
| ID | Nombre | Descripción | Actores | Prioridad | Criterios de Aceptación |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **REQ-USR-001** | Privacidad Financiera | Restricción de módulos de Caja, Deudas, Reportes y Gestión de Equipo exclusivamente al rol `admin`. | Personal | Crítica | Ocultamiento en `Sidebar.tsx` y protección en vistas operativas. |
| **REQ-USR-002** | Panel Operativo de Técnico | Interfaz simplificada para técnicos enfocada en diagnóstico y seguimiento de taller. | Técnico | Media | Botones de creación/eliminación de inventario ocultos para el rol `tecnico`. |
| **REQ-USR-003** | Acciones Masivas | Selección y procesamiento múltiple de registros en tablas operativas. | Admin, Recepción | Media | Capacidad de gestionar múltiples registros simultáneamente. |
| **REQ-USR-004** | Ficha de Perfil de Cliente | Vista consolidada de historial de reparaciones y saldos desde el directorio de clientes. | Personal | Alta | Modal detalle con todas las órdenes pasadas y saldo total adeudado. |
| **REQ-DOM-001** | Unicidad de SKU | El código de producto no puede repetirse en el inventario. | Sistema | Alta | Validación de unicidad en base de datos y formulario. |
| **REQ-DOM-002** | Integridad de Precios y Saldos | Precios positivos y validación estricta de fondos antes de cualquier egreso de efectivo o banco. | Sistema | Crítica | `useCaja.ts` bloquea egresos que superen el saldo disponible en gaveta o cuenta bancaria. |
| **REQ-SEC-001** | Row Level Security (RLS) | Políticas en PostgreSQL para restringir acceso a nivel de fila según rol y contexto. | Sistema | Crítica | Aislamiento de datos sensibles en Supabase. |
| **REQ-SEC-002** | Cifrado en Tránsito (SSL) y Secretos | Comunicación vía HTTPS y claves sensibles (`GEMINI_API_KEY`) resguardadas exclusivamente en entorno de servidor. | Sistema | Crítica | `GEMINI_API_KEY` nunca se expone con prefijo `NEXT_PUBLIC_`; solo es leída en Route Handlers de servidor. |
| **REQ-SEC-005** | Escudo Antifraude en Caja | Detección automática de fugas fuera de turno al abrir caja y ajustes obligatorios al cerrar con diferencias. | Admin, Sistema | Crítica | Registro automático de movimientos de ajuste (`Sobrante`/`Faltante`) y opción de justificación forense (`justifyShortage`). |
| **REQ-REL-003** | Neutralización de Anulaciones | Los movimientos anulados y sus contrapartidas (`ANULACIÓN: ...`) se neutralizan mutuamente en reportes y dashboards (`filtrarMovimientosValidos`). | Sistema | Crítica | Las reversiones contables mantienen el libro mayor intacto sin inflar ingresos ni egresos en las métricas de BI. |

---

## 🛠️ 4. Requerimientos de Reparaciones (REP) y Deudas (DEU)
| ID | Nombre | Descripción | Actores | Prioridad | Criterios de Aceptación |
| :--- | :--- | :--- | :--- | :---: | :--- |
| **REQ-REP-001** | Registro de Clientes | Base de datos de clientes vinculada relacionalmente (`cliente_id`) a las reparaciones. | Personal | Alta | Búsqueda por nombre/teléfono; creación rápida desde recepción. |
| **REQ-REP-002** | Ficha Técnica del Reloj | Registro de Marca, Modelo/Descripción, Tipo de reloj, Problema declarado y Diagnóstico técnico. | Personal | Crítica | Datos disponibles tanto para el maestro relojero como para el resumen público del cliente. |
| **REQ-REP-003** | Ciclo de Vida de Taller | Flujo de estados (Recibido/Diagnóstico → En Reparación → Listo → Entregado) con fechas de ingreso, compromiso y entrega. | Personal, Cliente | Crítica | Sincronización inmediata con el stepper de `/rastreo` y las respuestas del Chatbot. |
| **REQ-REP-004** | Control de Abonos y Saldos | Registro de anticipos y cálculo automático de `saldo_pendiente = precio_final - abono`. | Recepción, Admin | Alta | El saldo pendiente exacto se refleja en caja, reportes, portal de rastreo y asistente virtual. |
| **REQ-REP-005** | Boleta / Número de Recibo | Identificador único visible para el cliente (`numero_recibo`). | Todos | Crítica | Llave principal de búsqueda para seguimiento B2C y consultas en el Chatbot. |
| **REQ-DEU-001** | Cuentas por Cobrar/Pagar | Control de obligaciones financieras (`deudas_empresa`) con abonos vinculados a caja. | Admin | Alta | Seguimiento de saldos pendientes y estado de pago. |
