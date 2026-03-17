# ⌚ PRD: Sistema Administrativo RELOJERÍA IA

**Versión:** 1.0 (MVP)
**Propósito:** Digitalizar, automatizar y centralizar la gestión de una relojería para resolver problemas de desorden en el inventario, seguimiento de reparaciones, control de flujos de caja y gestión de deudas.
**Stack Tecnológico Principal:** Next.js (React), bases de datos relacional (ej. PostgreSQL/Supabase), Tailwind CSS / Vanilla CSS moderno.

---

## 🎯 1. Objetivos del Producto
*   **Eficiencia:** Reducir el tiempo de búsqueda de repuestos y estados de reparación.
*   **Control Financiero:** Mantener un registro exacto de caja (ingresos/egresos) y cuentas por pagar/cobrar.
*   **Experiencia del Cliente:** Generar tickets profesionales y tener trazabilidad exacta del estado de su reloj.
*   **Prevención de Pérdidas:** Alertas automáticas de stock mínimo para evitar quedarse sin insumos clave.

---

## 📦 2. Módulo de Inventario (Relojes y Repuestos)
El sistema debe permitir gestionar de forma dinámica las categorías y subcategorías del inventario.

### 2.1. Categorías Principales
1.  **Relojes para Venta:** Nuevos, Usados (Reacondicionados).
2.  **Repuestos y Consumibles:** Baterías (CR2032, SR626SW), Correas (Cuero, Acero, Silicona), Cristales, Pines/Empaques/Sellos, Piezas Internas, Insumos de Taller.

### 2.2. Campos del Modelo de Inventario (Entidades)
*   **Interruptor (Flag):** `Es Vendible` (Sí/No). Permite descontar insumos usados en taller sin mostrarlos en la tienda.
*   **Atributos Dinámicos de Reloj:** Marca, Modelo, Tipo (Dama, Caballero, Deportivo, etc.), Precio de Compra, Precio de Venta, Estado (Nuevo, Usado, Restaurado), Stock Actual, Ubicación (Vitrina, Bodega).
*   **Alertas de Stock:**
    *   Definición de "Stock Mínimo" por artículo.
    *   Vista/Notificación visual en el Dashboard (ej. *"Quedan 2 baterías CR2032"*, *"Stock agotado de correas 20mm"*).

---

## 🛠️ 3. Módulo de Gestión de Reparaciones (El Taller)
Seguimiento completo del ciclo de vida de un reloj que entra al taller.

### 3.1. Campos Obligatorios del Recibo de Reparación
*   **Identificación:** Número de Recibo (Generado automáticamente).
*   **Datos del Cliente:** Nombre del Cliente, Teléfono.
*   **Datos del Reloj:** Tipo de Reloj (Cuarzo, Mecánico, Pared, Otros), Marca, Modelo (Opcional), Estado Físico (Rayones, sin tapa, etc.).
*   **Datos Técnicos:** Descripción de la falla, Diagnóstico técnico, Técnico asignado.
*   **Fechas:** Fecha de Recepción, Fecha Estimada de Entrega, Fecha Final de Entrega.
*   **Finanzas de la Reparación:** Precio Final, Abono (si aplica), Saldo Pendiente, Método de Pago.
*   **Otros:** Estado de la reparación (Ver sección 3.2), Observaciones internas.

### 3.2. Flujo de Estados de Reparación
1.  Recibido
2.  En diagnóstico
3.  Esperando repuesto (Opcional)
4.  En reparación
5.  No repara
6.  Listo
7.  Entregado
8.  Garantía (Si el cliente regresa por una falla en el periodo de cobertura).

### 3.3. Funciones Adicionales
*   **Generador de Tickets:** Creación de ticket de recepción optimizado para impresión (formato térmico y PDF). *(Iteración futura: Integración con API de WhatsApp para notificaciones).*

---

## 💰 4. Módulo de Ingresos, Egresos y Reportes (La Caja)
Control absoluto de la liquidez y salud financiera del negocio.

### 4.1. Tipos de Transacciones
*   **Ingresos:** Venta de relojes, Reparaciones, Venta de repuestos, Servicios rápidos (Ajustes, Cambios de pila).
*   **Egresos:** Compra a proveedores, Sueldos, Alquiler, Servicios básicos (Agua, Luz, Internet), Compra de herramientas, Insumos del taller.

### 4.2. Reportes Dinámicos (Dashboard Analytics)
El panel principal debe mostrar de forma visual e intuitiva:
*   Ganancias netas del mes en curso vs mes anterior.
*   Gráfico de días con más ventas.
*   Ranking del gasto más recurrente.
*   Ranking del servicio/producto más vendido.
*   Flujo de caja actual (Dinero disponible).

---

## 🤝 5. Módulo de Cuentas por Cobrar y Pagar (Deudas)
Gestión de créditos otorgados y recibidos.

### 5.1. Cuentas por Pagar (A Proveedores)
*   **Datos:** Nombre del proveedor, Monto Total, Fecha de la deuda, Fecha límite de pago, Concepto (Mercadería, repuestos, etc.).
*   **Estados:** Pendiente, Pago Parcial, Pagado.

### 5.2. Cuentas por Cobrar (A Clientes)
*   Integración con Ventas/Reparaciones para registrar servicios a crédito.
*   Capacidad de registrar abonos parciales.
*   Cálculo automático del Saldo Pendiente.
*   Historial completo de pagos por cliente.

---

## 🔑 6. Seguridad y Usuarios (Roles)
El sistema soportará múltiples usuarios para el negocio, con los siguientes roles y permisos predefinidos:
*   **Administrador (Tú):** Acceso total e ilimitado a todos los módulos (Inventario, Taller, Finanzas, Deudas, Reportes y configuración de nuevos usuarios/categorías).
*   **Técnico / Relojero (Tu hermano / Tú):** Acceso enfocado al módulo de Reparaciones (para cambiar estados, agregar diagnósticos, descontar repuestos) y visión de lectura del Inventario de Repuestos.
*   **Cajero (Futuro):** Acceso exclusivo a la facturación, registro de abonos en cuentas por cobrar, y ventas directas. No podrá ver reportes de ganancias totales ni modificar inventarios de taller.
*   **Recepcionista (Futuro):** Acceso para ingresar nuevos relojes al taller (crear tickets de recepción) y consultar estados para informar a los clientes, sin acceso a las cajas fuertes o métricas financieras.

---
*Este documento actuará como la guía principal para la construcción del software en Next.js. Las prioridades pueden ajustarse según se avance en los sprints de desarrollo.*
