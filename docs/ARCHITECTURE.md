# 🏛️ Arquitectura del Sistema

Este documento describe la arquitectura técnica, el stack tecnológico y los patrones de diseño utilizados en **RELOJERÍA IA**.

## 🛠️ Stack Tecnológico

| Capa | Tecnología | Propósito |
| :--- | :--- | :--- |
| **Frontend** | Next.js 15 (App Router) | Framework principal y SSR/CSR |
| **Lenguaje** | TypeScript | Tipado estático y seguridad de código |
| **Estilos** | Tailwind CSS / Vanilla CSS | Diseño moderno, responsivo y "glassmorphism" |
| **Backend** | Supabase | Base de Datos, Autenticación y API autogenerada |
| **Estado** | React Context (Auth) | Gestión global de sesión y roles |

## 🏗️ Estructura de Componentes Críticos

### 1. AuthProvider (`src/components/AuthProvider.tsx`)
Actúa como la "fuente de verdad" para la seguridad.
- Escucha cambios en `onAuthStateChange` de Supabase.
- Consulta la tabla `perfiles` para obtener el rol del usuario actual.
- Provee el contexto `user`, `rol` y `loading` a toda la aplicación.
- Redirige automáticamente al `/login` si no hay sesión activa.

### 2. Sidebar Recolector (`src/components/Sidebar.tsx`)
Genera la navegación dinámicamente:
- Filtra los elementos del menú basándose en el array `roles` definido para cada ruta.
- Implementa un **Hydration Guard** para evitar parpadeos de UI y errores de SSR.

### 3. SettingsProvider (`src/hooks/useSettings.tsx`)
Provee la configuración global (moneda, tema, recibos) a toda la aplicación.
- Sincroniza configuraciones de base de datos (`empresa_config`).
- Utiliza **Supabase Realtime** (`channel('custom-all-channel')`) para recibir actualizaciones instantáneas cuando un administrador cambia la configuración, replicando el cambio visualmente en todas las sesiones activas del equipo (ej. Cambio de símbolo `$`).

### 4. Hydration & Stability Pattern
Para evitar errores de hidratación y asegurar que el código dependiente del navegador no se ejecute prematuramente en el servidor:
- **Mounted Guard**: Se usa un estado `mounted` en `useEffect` para condicionar el renderizado de componentes interactivos.
- **Session Pulse**: El sistema detecta el foco de la ventana (`window.onfocus`) y sincroniza los datos automáticamente para prevenir sesiones inactivas "fantasma".

## 🔐 Flujo de Seguridad (RBAC)

El sistema utiliza un modelo de **Control de Acceso Basado en Roles (RBAC)** implementado en dos niveles:

1.  **Nivel de Interfaz (Frontend):**
    - El `Sidebar` oculta módulos no autorizados.
    - Las páginas protegidas (ej. `/deudas`) contienen un `useEffect` que redirige al Home si el usuario no tiene privilegios de `admin`.
2.  **Nivel de Datos (Backend):**
    - **Row Level Security (RLS)** activadas en tablas operativas.
    - Se integra el hook `useAudit` para registrar de manera inmutable el `usuario_email` y el `user_id` ante acciones sensibles (ej. Pagos de deudas, Anulaciones).
    - **Escudo Antifraude de Caja:** Desviaciones entre el capital físico (`montoCierreReal`) y el software desencadenan requerimientos mandatorios (Notas Inviolables de Justificación).

## 📁 Organización de Archivos

```text
src/
├── app/            # Rutas y páginas (Arquitectura de App Router)
│   ├── layout.tsx  # Layout global con AuthProvider y Sidebar
│   ├── page.tsx    # Dashboard principal con estadísticas
│   └── [modulos]/  # Páginas específicas por funcionalidad
├── components/     # UI reusable y lógica de layout
└── lib/            # Configuración de clientes (Supabase)
```

## 📊 Analítica y Auditoría Forense (Módulo BI)

El sistema implementa una capa de **Business Intelligence (BI)** diseñada para ofrecer transparencia total sin sacrificar el rendimiento:

1.  **Drill-Down Recursivo**: Las consultas a movimientos de caja integran un *join* con `caja_movimientos_detalles`. La UI utiliza un patrón de **Lazy Drill-down** donde el detalle de artículos vendidos se renderiza mediante un componente de expansión que solo procesa datos cuando el usuario interactúa.
2.  **Analítica Temporal Comparativa**: El motor de reportes calcula automáticamente deltas porcentuales (crecimiento/decrecimiento) comparando los agregados del periodo actual contra el anterior (ej. Mayo vs Abril), permitiendo detectar fugas de capital o picos de ventas instantáneamente.
3.  **Trazabilidad de Inventario-Reparación y POS**: Se establece un vínculo relacional entre el stock, el taller y la caja. Al aplicar un insumo a una reparación o venderlo mediante el **Sistema POS de Caja** (con carrito de compras), el sistema garantiza la atomicidad de la operación: se descuenta el stock, se genera el comprobante detallado y se registra el movimiento en un solo flujo.
4.  **Auditoría Forense de Turnos**: El reporte P&L permite exportación a PDF y proporciona una bandeja de recibos y auditoría detallada de todos los artículos y métodos de pago utilizados en cada turno de caja.
5.  **Enrutamiento Bancario Directo**: Pagos pueden ser ruteados directamente a bancos específicos (ej. Banpro) durante la entrega final, evadiendo transferencias manuales post-entrega.

## 🛡️ Integridad Transaccional Avanzada
- **Bloqueo por Sesión de Caja**: Las operaciones financieras en el taller (reparaciones/abonos) están condicionadas al estado global de la caja. El sistema consulta el hook `useCaja` para verificar si existe una jornada activa antes de permitir persistir cambios, mitigando descuadres por operaciones "fuera de turno".
- **Compensación de Anulaciones**: Las anulaciones de movimientos monetarios generan transacciones reversas (+ y -) de compensación antes de eliminaciones absolutas, manteniendo la integridad del libro contable.

---
*Última revisión técnica: Junio 2026*
