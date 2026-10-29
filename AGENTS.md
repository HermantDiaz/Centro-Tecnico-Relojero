# Configuración de Agentes, Reglas y Skills - Relojería IA

Este repositorio cuenta con un catálogo curado de reglas, habilidades (*skills*) y agentes especializados instalados en `.agents/` (provenientes del estándar ECC y optimizados para Google Antigravity).

---

## 🛠️ Stack Tecnológico del Proyecto

- **Framework**: Next.js 15+ (App Router, Server Actions, Route Handlers, Turbopack)
- **Frontend**: React 19, TypeScript (Strict Mode), Tailwind CSS, Lucide React
- **Backend & Base de Datos**: Supabase (PostgreSQL, Row Level Security - RLS, Migraciones SQL, Triggers, Storage)
- **Dominio**: ERP & Punto de Venta (POS) para Relojería y Joyería (Cajas diarias, inventarios, reparaciones, reportes financieros y P&L)
- **Extensiones Futuras**:
  - Aplicación Móvil: Flutter / Dart o React Native
  - Microservicios de IA: Python (FastAPI) con pipelines RAG para consultas de inventario y atención al cliente

---

## 📂 Estructura de Customizaciones (`.agents/`)

```text
.agents/
├── rules/       # Reglas contextuales aplicadas automáticamente
├── skills/      # Habilidades operativas bajo demanda (progressive disclosure)
└── agents/      # Agentes especializados para tareas complejas
```

---

## 📜 Reglas Activas (`.agents/rules/`)

1. **TypeScript**: `typescript-coding-style.md`, `typescript-patterns.md`, `typescript-security.md`, `typescript-testing.md`.
2. **React**: `react-coding-style.md`, `react-hooks.md`, `react-patterns.md`, `react-security.md`, `react-testing.md`.
3. **Web**: `web-coding-style.md`, `web-design-quality.md`, `web-patterns.md`, `web-performance.md`, `web-security.md`.
4. **Comunes**: `common-code-review.md`, `common-coding-style.md`, `common-git-workflow.md`, `common-performance.md`, `common-security.md`.
5. **Preparadas para Futuro**: `dart-coding-style.md`, `react-native-coding-style.md`, `python-coding-style.md`.

---

## ⚡ Skills Esenciales (`.agents/skills/`)

### Frontend & Next.js / React
- `nextjs-turbopack`: Optimización de bundling incremental, App Router y caché de Turbopack.
- `react-patterns`: Buenas prácticas y patrones recomendados para React 19.
- `react-performance`: Eliminación de re-renders innecesarios, virtualización y métricas web.
- `react-testing`: Guías para testing de componentes y lógica reactiva.
- `frontend-patterns`: Arquitectura de componentes, modularidad y separación de responsabilidades.
- `frontend-design-direction`: Criterios estéticos y jerarquía visual en aplicaciones web modernas.
- `design-system`: Consistencia en componentes UI, tokens de diseño y paletas Tailwind.
- `make-interfaces-feel-better`: Micro-interacciones, animaciones sutiles y feedback de usuario instantáneo.

### Base de Datos & Backend (Supabase / PostgreSQL)
- `postgres-patterns`: Patrones avanzados de PostgreSQL (índices compuestos, B-tree/GIN, tipos de datos óptimos) basados en las mejores prácticas oficiales de Supabase.
- `database-migrations`: Creación segura de migraciones SQL sin bloqueos de tablas ni pérdida de datos.
- `backend-patterns`: Diseño de endpoints, manejo de errores robusto, idempotencia y autenticación.

### Calidad, Seguridad y Verificación
- `coding-standards`: Estándares limpios de ingeniería de software, SOLID y DRY.
- `error-handling`: Programación defensiva, boundaries de error y mensajes de usuario claros.
- `security-review`: Auditoría de seguridad web, OWASP, protección contra inyecciones y fugas de RLS.
- `security-scan`: Chequeo rápido de vulnerabilidades en código y dependencias.
- `tdd-workflow`: Ciclos de desarrollo guiado por pruebas.
- `verification-loop`: Verificación previa a producción, compilación y pruebas de regresión.
- `browser-qa`: Aseguramiento de calidad en navegador y flujos E2E.

### Preparadas para Futuro (Mobile & IA)
- `dart-flutter-patterns`: Patrones de arquitectura limpia y widgets reactivos para Flutter.
- `flutter-dart-code-review`: Checklist de revisión de código para apps móviles en Flutter.
- `react-native-patterns`: Patrones para aplicaciones móviles con React Native.
- `python-patterns`: Estándares de desarrollo en Python moderno.
- `fastapi-patterns`: Creación de microservicios REST de alto rendimiento en FastAPI.
- `iterative-retrieval`: Diseño de pipelines RAG para búsquedas semánticas e inteligencia artificial.

---

## 🤖 Agentes Especializados (`.agents/agents/`)

- `architect.md`: Diseño de sistemas, flujos de datos y arquitectura de nuevas características.
- `code-reviewer.md`: Revisión exhaustiva de código y buenas prácticas de ingeniería.
- `security-reviewer.md`: Especialista en análisis de vulnerabilidades, RLS y autenticación segura.
- `react-reviewer.md`: Revisor específico de código React / Next.js.
- `react-build-resolver.md`: Resolución de fallos de compilación y bundling en Next.js.
- `typescript-reviewer.md`: Experto en tipado estricto, interfaces e inferencia de TypeScript.
- `database-reviewer.md`: Especialista en PostgreSQL y Supabase (RLS, índices, rendimiento de consultas).
- `performance-optimizer.md`: Optimización de latencia, carga inicial y rendimiento de renderizado.
- `build-error-resolver.md`: Diagnóstico y resolución de fallos generales de build.
- `refactor-cleaner.md`: Limpieza de código muerto y simplificación sin regresiones.
- `silent-failure-hunter.md`: Detección de promesas no capturadas y errores silenciosos.
- `e2e-runner.md`: Pruebas de integración de extremo a extremo.
- `flutter-reviewer.md`: *(Futuro)* Revisión de código móvil en Flutter.
- `fastapi-reviewer.md` / `python-reviewer.md`: *(Futuro)* Revisión de APIs en Python.
- `rag-pipeline-reviewer.md`: *(Futuro)* Evaluación de pipelines de IA y bases de datos vectoriales.

