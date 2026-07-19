**CTR System - Core Administration & Retail Analytics**
Current Status: v12.0 - PRODUCTION (Active deployment running daily business operations).

A custom, lightweight administrative and financial platform built to digitize inventory tracking, service workflows, and cash flow ledger management for a specialized horology and retail business (Centro Técnico Relojero).


## Key Engineering Features Implemented:

- **Hardened Security:**  Row-Level Security (RLS) policies implemented natively in PostgreSQL to ensure strict data isolation across user roles.
- **Dynamic Document Rendering:** Real-time generation and preview of customizable business receipts.
- **State & Memory Optimization** Reactive analytics module designed with a 12-month rolling memory optimization layer for historical revenue/expense aggregation.

## Tecnologías Principales

- **Frontend:** [Next.js 15+](https://nextjs.org/) (App Router)
- **Lenguage:** TypeScript
- **Styling:** Tailwind CSS / Modern Vanilla CSS
- **Backend/Base de Datos:** [Supabase](https://supabase.com/) (PostgreSQL + Auth + Storage)
- **Assets:** Optimized SVGs and clean icon layouts


## Project Structure Overview

The codebase uses Next.js App Router conventions under the src/app/ directory, isolating business logic by domain:

  - `/admin/usuarios`: Team provisioning, role assignment, and access control management.
  - `/inventario`: Stock monitoring, spare parts categorization, and low-inventory tracking.
  - `/reparaciones`: Core technical service CRM, customer lookup mechanics, and real-time repair lifecycle tracking.
  - `/caja`: Daily cash register ledger processing, anti-fraud validation hooks, and safe/bank transfer auditing.
  - `/deudas`: Accounts Receivable (AR) and Accounts Payable (AP) pipelines mapped directly to the master cash flow.
  - `/reportes`: Reactive business intelligence panel featuring dynamic data visualization, top revenue/expense filtering, and historical performance tracking.
  - `/ajustes`: Central system configuration engine (Appearance overrides, global multi-currency toggle, and interactive receipt templates).

- `src/components/`: Shared React UI components (Navigation sidebars, layout wrappers, and global Context Providers).
- `src/lib/`: Unified utility setups, custom helper functions, and the initialized Supabase client infrastructure.
- `docs/`: Dedicated internal technical blueprints and system references.

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

## Documentación Relacionada

- [Arquitectura del Sistema](file:///d:/Proyecto%20IA/RELOJERIA%20IA/docs/ARCHITECTURE.md)
- [Modelo de Base de Datos](file:///d:/Proyecto%20IA/RELOJERIA%20IA/docs/DATABASE.md)
- [Roles y Permisos](file:///d:/Proyecto%20IA/RELOJERIA%20IA/docs/ROLES_PERMISSIONS.md)
- [PRD Original](file:///d:/Proyecto%20IA/RELOJERIA%20IA/docs/PRD.md)
