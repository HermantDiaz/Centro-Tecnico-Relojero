# ⌚ CTR System - Core Administration & Retail Analytics

**Current Status:** `v12.3.0 - PRODUCTION` (Sistema POS, Auditoría Forense, Routing Bancario, Exportador PDF P&L, y Seguridad RLS Parcheada)

A custom, lightweight administrative and financial platform built to digitize inventory tracking, service workflows, and cash flow ledger management for a specialized horology and retail business (Centro Técnico Relojero).

## Key Engineering Features Implemented:

- **Hardened Security:** Row-Level Security (RLS) policies implemented natively in PostgreSQL to ensure strict data isolation across user roles.
- **Dynamic Document Rendering:** Real-time generation and preview of customizable business receipts.
- **Financial & POS Engine:** Direct retail checkout with inventory deduction, anti-fraud validation hooks, and safe/bank transfer auditing.
- **Forensic Cash Register Auditing:** Comprehensive shift tracking, discrepancy justification, and physical cash verification.
- **State & Memory Optimization:** Reactive analytics module with discrete month/year filtering, eliminating PostgREST row limits and achieving instant load times.

## Core Tech Stack

- **Frontend:** [Next.js 15+](https://nextjs.org/) (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS / Modern Vanilla CSS
- **Backend / Database:** [Supabase](https://supabase.com/) (PostgreSQL + Auth + Storage)
- **Assets:** Lucide Icons & Optimized SVGs

## Project Structure Overview

The codebase uses Next.js App Router conventions under the `src/app/` directory, isolating business logic by domain:

- `/admin/usuarios`: Team provisioning, role assignment, and access control management.
- `/inventario`: Stock monitoring, spare parts categorization, and low-inventory tracking.
- `/reparaciones`: Core technical service CRM, customer lookup mechanics, and real-time repair lifecycle tracking.
- `/caja`: Daily cash register ledger processing, anti-fraud validation hooks, and safe/bank transfer auditing.
- `/deudas`: Accounts Receivable (AR) and Accounts Payable (AP) pipelines mapped directly to master cash flow.
- `/reportes`: Reactive business intelligence panel featuring dynamic data visualization, top revenue/expense filtering, and historical performance tracking.
- `/ajustes`: Central system configuration engine (Appearance overrides, global multi-currency toggle, and interactive receipt templates).

- `src/components/`: Shared React UI components (Navigation sidebars, layout wrappers, and global Context Providers).
- `src/lib/`: Unified utility setups, custom helper functions, and the initialized Supabase client infrastructure.
- `docs/`: Dedicated internal technical blueprints and system references.

## Local Setup & Development

1. **Install Project Dependencies**
   ```bash
   npm install
   ```

2. **Environment Configuration**
   Create a local environment file named `.env.local` in the root directory and supply your project credentials:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=tu_url_aqui
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anon_aqui
   ```

3. **Spin Up Development Server:**
   ```bash
   npm run dev
   ```

## Related Engineering Artifacts

For deeper architectural breakdowns, refer to the local files located within the `docs/` directory:

- [Arquitectura del Sistema](file:///d:/Proyecto%20IA/RELOJERIA%20IA/docs/ARCHITECTURE.md)
- [Modelo de Base de Datos](file:///d:/Proyecto%20IA/RELOJERIA%20IA/docs/DATABASE.md)
- [Roles y Permisos](file:///d:/Proyecto%20IA/RELOJERIA%20IA/docs/ROLES_PERMISSIONS.md)
- [PRD Original](file:///d:/Proyecto%20IA/RELOJERIA%20IA/docs/PRD.md)
- [Guía de Despliegue](file:///d:/Proyecto%20IA/RELOJERIA%20IA/docs/DEPLOYMENT_GUIDE.md)
