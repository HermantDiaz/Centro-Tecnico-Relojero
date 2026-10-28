# Guía de Despliegue (Deployment Plan)
**Proyecto:** Relojería IA v2.0
**Contexto Tecnológico:** Frontend alojado en Vercel (Next.js 15 App Router), Backend y Base de Datos en Supabase (PostgreSQL, Storage Buckets).
**Seguridad Base:** RLS (Row Level Security), JWT Auth, Middleware Next.js, SSL/HTTPS forzado.

---

## Fase 1: Preparación (Pre-Despliegue)

La fase de pre-despliegue tiene como objetivo garantizar la integridad y estabilidad del código antes de impactar el entorno de producción.

1.  **Validación de Compilación Estática (DEP-01):**
    *   Se requiere ejecutar de forma obligatoria el comando de compilación local y/o en el pipeline de CI/CD: `npm run build` (o `next build`).
    *   Esta acción debe finalizar con código de salida `0`, asegurando la ausencia total de errores de *linting* (ESLint) y de tipos (TypeScript Type Checking). Cualquier advertencia crítica detectada en el árbol de rutas (App Router) bloqueará el paso a producción.
2.  **Validación de Variables de Entorno y Secretos (DEP-02):**
    *   Confirmar que las variables inyectadas en el entorno destino (ej. Vercel Secrets) coincidan estrictamente con las credenciales de producción.
    *   Debe validarse que `NEXT_PUBLIC_SUPABASE_URL` y las llaves correspondientes (Anon/Service Role) apunten efectivamente a la instancia de base de datos de producción y no a entornos de *staging* o desarrollo local.

---

## Fase 2: Ejecución del Despliegue

La ejecución del despliegue requiere precisión en la orquestación entre la infraestructura de frontend y la persistencia de datos. El siguiente registro estandariza las acciones críticas:

| ID | Categoría | Acción a Ejecutar | Resultado Esperado |
| :--- | :--- | :--- | :--- |
| **DEP-03** | Base de Datos | Sincronización de Base de Datos. Ejecución de migraciones de esquema SQL a través del entorno CLI de Supabase (`supabase db push`). | Migraciones aplicadas correctamente en producción sin pérdida, corrupción o bloqueo (lock) de la data existente. |
| **DEP-05** | Red / Seguridad | Configuración y forzado de certificados SSL en el proveedor de alojamiento (Vercel). Configuración de redirección HTTP 308 a HTTPS. | Todo el tráfico web entrante es forzado al protocolo seguro (TLS/SSL). Tráfico en texto plano es rechazado o redireccionado exitosamente. |

---

## Fase 3: Verificación (Post-Despliegue / Smoke Tests)

Tras finalizar el pipeline de despliegue, el equipo de SQA deberá ejecutar los siguientes *Smoke Tests* obligatorios en el entorno en vivo:

### Seguridad y Autenticación
*   **DEP-06 (Validación JWT):** Ejecutar un flujo de *Login* real con credenciales válidas e inválidas. Confirmar la generación correcta y el ciclo de vida del token JWT en sesión.
*   **DEP-04 (Políticas RLS):** Intentar acceder o mutar registros ajenos al rol del usuario autenticado (ej. un empleado intentando leer la nómina). El sistema debe rechazar la solicitud a nivel de base de datos gracias al *Row Level Security*.
*   **DEP-08 (Protección de Middleware):** Realizar accesos directos por URL (Deep Linking) a rutas administrativas (ej. `/admin` o `/ajustes`) sin estar autenticado. El Middleware de Next.js debe interceptar y redirigir al usuario al `/login`.

### Funcionalidad
*   **DEP-07 (Storage Buckets):** Ejecutar la carga (Upload) y visualización de una imagen de reloj (evidencia de reparación) en Supabase Storage. Confirmar que los permisos de lectura de la URL firmada o pública sean correctos.

### Rendimiento
*   **DEP-09 (Métricas Web):** Utilizar herramientas como Lighthouse o Vercel Speed Insights para validar que el tiempo de carga de despliegue de contenido inicial (FCP - *First Contentful Paint*) en el Dashboard principal sea estrictamente **inferior a 2 segundos**.

### Smoke Test Crítico de Negocio
*   **DEP-10 (Cierre de Caja y BI):** Efectuar una operación de "Cierre de Caja" completo. Validar que el registro histórico persista correctamente en PostgreSQL y, simultáneamente, verificar que el panel de Inteligencia de Negocios (BI) actualice de manera reactiva sus gráficas e indicadores de pérdidas y ganancias (P&L).

---

## Fase 4: Mitigación, Rollback y Monitoreo

### Plan de Rollback (Contingencia)
Ante cualquier eventualidad catastrófica (ej. caída masiva, degradación del servicio o fallo en producción), se establece el siguiente protocolo de Rollback:
*   El equipo DevOps tiene la directriz de aplicar un **Rollback Inmediato** (Instant Rollback en Vercel) al commit anterior estable. Este proceso debe ejecutarse y restaurar la disponibilidad del sistema en **menos de 2 minutos**.

### Monitoreo de Recursos y Límites de Memoria
*   **Control de Payloads:** Se deberá monitorizar de manera proactiva las consultas pesadas al histórico de la base de datos (módulo de BI y Reportes). Se exige aplicar paginación o límites en las consultas de Supabase para evitar cuellos de botella (OOM - *Out of Memory*) durante la extracción de datos masivos.
*   **Alertas:** Configuración de alertas reactivas en el panel del servidor ante cualquier incremento abrupto en la tasa de errores HTTP 500 originados en las funciones de backend.
