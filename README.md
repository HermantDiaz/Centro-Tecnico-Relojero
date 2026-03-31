# ⌚ RELOJERÍA IA - Sistema Administrativo
**Estado Actual:** `v10.8 - TITANIUM-STABLE` (Estabilidad de Sesión y Hidratación garantizada)

## 🚀 Tecnologías Principales

- **Frontend:** [Next.js 15+](https://nextjs.org/) (App Router)
- **Lenguaje:** TypeScript
- **Estilos:** Tailwind CSS / Modern Vanilla CSS
- **Backend/Base de Datos:** [Supabase](https://supabase.com/) (PostgreSQL + Auth + Storage)
- **Iconografía:** Emojis y SVG optimizados

## 📂 Estructura del Proyecto

- `src/app/`: Rutas y páginas de la aplicación (Next.js App Router).
  - `/admin/usuarios`: Gestión de equipo y roles.
  - `/inventario`: Control de stock, repuestos y categorías.
  - `/reparaciones`: Seguimiento de servicios técnicos (En desarrollo).
  - `/finanzas`: Ingresos, gastos y flujo de caja (En desarrollo).
  - `/deudas`: Cuentas por cobrar y pagar (En desarrollo).
- `src/components/`: Componentes React reutilizables (Sidebar, AuthProvider, etc.).
- `src/lib/`: Utilidades y configuraciones (Supabase client).
- `docs/`: Documentación técnica detallada.

## 🛠️ Configuración y Desarrollo

1. **Instalar dependencias:**
   ```bash
   npm install
   ```

2. **Variables de Entorno:**
   Crea un archivo `.env.local` con las credenciales de Supabase:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=tu_url_aqui
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anon_aqui
   ```

3. **Ejecutar en desarrollo:**
   ```bash
   npm run dev
   ```

## 📖 Documentación Relacionada

- [Arquitectura del Sistema](file:///d:/Proyecto%20IA/RELOJERIA%20IA/docs/ARCHITECTURE.md)
- [Modelo de Base de Datos](file:///d:/Proyecto%20IA/RELOJERIA%20IA/docs/DATABASE.md)
- [Roles y Permisos](file:///d:/Proyecto%20IA/RELOJERIA%20IA/docs/ROLES_PERMISSIONS.md)
- [PRD Original](file:///d:/Proyecto%20IA/RELOJERIA%20IA/docs/PRD.md)
