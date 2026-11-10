# ⌚ CTR System — Monorepo Omnicanal (ERP/POS + Tienda B2C + Asistente IA RAG)

**Estado Actual:** `v13.0.0 - MONOREPO PRODUCTION` (Arquitectura Modular en Workspaces: `apps/admin`, `apps/web`, `packages/database`, `packages/ai-engine` y `packages/ui`)

Plataforma integral diseñada para digitalizar la operación técnica, comercial y financiera de **Centro Técnico Relojero** (Managua, Nicaragua), unificando la gestión interna de taller y caja con la atención automatizada al cliente 24/7.

---

## 🏗️ Estructura del Monorepo

```text
relojeria-ia/
├── apps/
│   ├── admin/                      # [Puerto 3001] ERP Privado, POS Forense, Taller y BI
│   │   └── src/
│   │       ├── app/                # /, /login, /caja, /inventario, /reparaciones, /clientes,
│   │       │                       # /deudas, /reportes, /ajustes, /admin/usuarios
│   │       ├── components/         # AuthProvider.tsx, Sidebar.tsx, caja/ComprobantePago.tsx
│   │       └── hooks/              # useCaja.ts, useSettings.tsx, useAudit.ts
│   │
│   └── web/                        # [Puerto 3000] Plataforma Pública B2C Unificada
│       └── src/
│           └── app/
│               ├── page.tsx        # Página Única B2C: Tienda + Sistema de Rastreo + Chatbot IA (/)
│               └── api/chat/route.ts # Endpoint HTTP conectado a @relojeria/ai-engine
│
├── packages/
│   ├── database/                   # (@relojeria/database) Clientes Supabase Browser/Server,
│   │                               # tipos compartidos, finanzasUtils y consulta segura de recibos
│   ├── ai-engine/                  # (@relojeria/ai-engine) Base de conocimiento (tallerKnowledge),
│   │                               # RAG dinámico sobre reparaciones y orquestador Google Gemini
│   └── ui/                         # (@relojeria/ui) Componente reutilizable ChatWidget.tsx
│
├── docs/                           # Documentación técnica, PRD v3.0, RTM, E/R y Despliegue
├── turbo.json                      # Pipeline de tareas del Monorepo
└── package.json                    # Configuración de npm Workspaces
```

---

## 🚀 Capacidades Principales del Ecosistema

### 1. `apps/admin` — ERP, Taller y Punto de Venta (POS)
- **Seguridad Basada en Roles (RBAC & RLS):** Aislamiento de permisos para `admin`, `recepcion` y `tecnico` tanto en interfaz como en políticas Row-Level Security de PostgreSQL.
- **Motor POS & Caja Forense (`/caja`):** Ventas con descuento atómico de inventario, comisión POS automática (4%), validación de fondos en efectivo/bancos (`BAC`, `LAFISE`, `BANPRO`), detección de fugas entre turnos y justificación forense de faltantes.
- **CRM de Taller de Relojería (`/reparaciones`):** Ciclo de vida completo de órdenes de servicio, asignación de técnicos, consumo de repuestos, control de garantías y emisión de recibos.
- **Business Intelligence y P&L (`/reportes`):** Analítica comparativa mensual/anual, *drill-down* de artículos vendidos, neutralización automática de anulaciones (`filtrarMovimientosValidos`) y exportación de reportes.

### 2. `apps/web` & `packages/ai-engine` — Plataforma Pública B2C y Asistente IA
- **Portal Público de Rastreo (`/rastreo`):** Consulta instantánea sin inicio de sesión mediante número de recibo (`#1042` o `?recibo=1042`), con línea de tiempo de 4 etapas, presupuesto, abono, saldo pendiente y contacto directo a WhatsApp.
- **Vitrina Digital B2C (`/` y `/tienda`):** Catálogo comercial y presentación de estándares de servicio técnico certificado, libre de la sobrecarga de autenticación del ERP.
- **Asistente Virtual Inteligente (`@relojeria/ui` + `@relojeria/ai-engine`):**
  - **RAG + Tool Calling en Tiempo Real:** Detecta números de recibo en la conversación y consulta `reparaciones` en Supabase en vivo con 0% de alucinaciones.
  - **Conocimiento Técnico Oficial (`tallerKnowledge.ts`):** Informa tarifas estimadas, tiempos de entrega, ubicación, horarios y garantías.
  - **Inferencia Ultra-Rápida y Resiliente:** Impulsado por Google Gemini (`thinkingBudget: 0`) con cascada de respaldo multi-modelo.

---

## ⚙️ Comandos del Monorepo

1. **Instalar y enlazar workspaces:**
   ```bash
   npm install
   ```

2. **Iniciar entorno de desarrollo (levanta ambos puertos 3000 y 3001 en paralelo):**
   ```bash
   # Levanta simultáneamente:
   # • Tienda B2C + Rastreo + Chatbot IA en http://localhost:3000
   # • ERP Administrativo / POS Taller   en http://localhost:3001
   npm run dev

   # O de forma individual:
   npm run dev:web
   npm run dev:admin
   ```

3. **Compilar e iniciar en modo producción (puertos 3000 y 3001):**
   ```bash
   npm run build
   npm run start
   ```

4. **Verificar tipado estático en los 5 paquetes/apps:**
   ```bash
   npm run typecheck
   ```

---

## 📚 Documentación de Ingeniería (`docs/`)

- [Arquitectura General del Sistema](file:///d:/Proyecto%20IA/RELOJERIA%20IA/docs/ARCHITECTURE.md)
- [Arquitectura B2C, Monorepo & Motor RAG](file:///d:/Proyecto%20IA/RELOJERIA%20IA/docs/ARQUITECTURA_B2C_RAG.md)
- [Documento de Requerimientos del Producto (PRD v3.0)](file:///d:/Proyecto%20IA/RELOJERIA%20IA/docs/PRD.md)
- [Matriz de Trazabilidad de Requerimientos (RTM)](file:///d:/Proyecto%20IA/RELOJERIA%20IA/docs/RTM.md)
- [Modelo de Base de Datos (E/R)](file:///d:/Proyecto%20IA/RELOJERIA%20IA/docs/DATABASE.md)
- [Roles y Permisos (RBAC)](file:///d:/Proyecto%20IA/RELOJERIA%20IA/docs/ROLES_PERMISSIONS.md)
- [Guía de Despliegue y Smoke Tests](file:///d:/Proyecto%20IA/RELOJERIA%20IA/docs/DEPLOYMENT_GUIDE.md)
- [Plan de Pruebas QA UI/UX](file:///d:/Proyecto%20IA/RELOJERIA%20IA/docs/QA_UI_TEST_PLAN.md)
- [Plan de Gestión de Riesgos](file:///d:/Proyecto%20IA/RELOJERIA%20IA/docs/RISK_MANAGEMENT_PLAN.md)
