# Plan de Gestión de Riesgos
**Proyecto:** RELOJERIA IA (Sistema Administrativo para la Relojería CTR)
**Fecha:** Junio 2026

---

## Paso 1: Objetivos, Metodología y Roles

### Objetivos del Plan
El propósito fundamental de este Plan de Gestión de Riesgos es asegurar el éxito en la implementación del Sistema Administrativo para la Relojería (RELOJERIA IA). Esto se logrará mediante la identificación proactiva, evaluación rigurosa y mitigación efectiva de las amenazas que puedan comprometer el alcance, el cronograma, el presupuesto o la calidad técnica y operativa del software.

### Metodología de Evaluación
Se empleará una metodología de análisis cualitativo basada en la matriz de **Probabilidad e Impacto**. Cada riesgo será evaluado en una escala del 1 al 5 tanto para su probabilidad de ocurrencia como para el impacto que tendría en el proyecto. 

### Roles y Responsabilidades
*   **Gerente de Proyecto (Project Manager):** Responsable de la gestión general de riesgos. Facilita la identificación de riesgos, asigna recursos para las estrategias de respuesta y monitorea la efectividad de las acciones.
*   **Equipo de Desarrollo e Ingeniería:** Encargado de identificar riesgos técnicos en fases tempranas, reportar anomalías de seguridad o de arquitectura y ejecutar las tareas técnicas de mitigación.
*   **Comité de Riesgos (Stakeholders y Liderazgo Técnico):** Evalúa los riesgos de impacto crítico, aprueba los planes de respuesta que requieran incrementos presupuestales y toma decisiones clave de continuidad.

---

## Paso 2: Identificación de Riesgos

En el contexto tecnológico y comercial de un sistema para gestión de reparaciones e inventario (CTR), se han identificado los siguientes 7 riesgos principales:

1.  **Corrupción del alcance (Scope Creep):** Adición constante de funcionalidades secundarias no definidas en los requerimientos originales (PRD), desviando el objetivo principal del sistema.
2.  **Bajo desempeño (Performance):** La interfaz de usuario o las consultas a la base de datos se vuelven lentas al manejar un alto volumen de registros históricos de reparaciones e inventario.
3.  **Problemas de costos:** Superación del presupuesto estimado inicial, especialmente relacionado con costos inesperados de infraestructura en la nube o herramientas de terceros.
4.  **Factor tiempo (Retrasos):** Incumplimiento del cronograma estipulado para el despliegue de los módulos principales (como el flujo de ingreso de reparaciones o facturación).
5.  **Escasez de recursos:** Indisponibilidad de personal técnico capacitado o rotación de desarrolladores clave durante etapas críticas de construcción.
6.  **Problemas técnicos y de seguridad:** Vulnerabilidades en la gestión de roles y accesos (RBAC), o pérdida de integridad de la base de datos que exponga información confidencial de clientes.
7.  **Falta de claridad en requerimientos:** Ambigüedad en la definición de estados de reparación o reglas de negocio operativas que lleven a un retrabajo técnico.

---

## Paso 3: Análisis y Evaluación

Para el análisis, se calculará el **Nivel de Riesgo** utilizando la fórmula estándar:
> **Nivel de Riesgo = Probabilidad (1 a 5) × Impacto (1 a 5)**

**Escala de Valoración:**
*   **Probabilidad:** 1 (Muy Improbable) a 5 (Casi Seguro).
*   **Impacto:** 1 (Insignificante) a 5 (Catastrófico).

**Zonas de Prioridad (Rango 1 al 25):**
*   **Baja (1 - 5):** Se asume y monitorea rutinariamente.
*   **Media (6 - 12):** Requiere un plan de respuesta y seguimiento activo.
*   **Alta (13 - 25):** Exige mitigación inmediata, atención directiva y asignación prioritaria de recursos.

---

## Paso 4: Plan de Respuesta (Matriz de Registro de Riesgos)

| ID | Descripción del Riesgo | Nivel de Prioridad (P × I) | Estrategia de Respuesta | Acción de Respuesta Propuesta |
| :--- | :--- | :---: | :--- | :--- |
| **R01** | **Corrupción del alcance.** Aumento de requerimientos no planificados. | **16** (4×4) - **Alta** | **Mitigar** | Implementar un proceso estricto de control de cambios. Todo requerimiento nuevo debe pasar por el Comité para evaluar impacto en tiempo/costo antes de aprobarse. |
| **R02** | **Problemas técnicos / Seguridad.** Fuga de datos o accesos no autorizados. | **20** (4×5) - **Alta** | **Evitar** | Auditar la arquitectura de seguridad, implementar autenticación robusta y revisión estricta de las políticas de la base de datos y esquema RBAC. |
| **R03** | **Factor tiempo.** Retrasos críticos en los hitos de entrega. | **15** (3×5) - **Alta** | **Mitigar** | Adoptar marcos ágiles (Scrum/Kanban) con sprints cortos de 2 semanas, revisiones periódicas y priorización de un MVP (Minimum Viable Product). |
| **R04** | **Falta de claridad.** Ambigüedad en las reglas de negocio de la relojería. | **12** (4×3) - **Media** | **Mitigar** | Realizar sesiones de refinamiento previas al desarrollo. Documentar flujos de trabajo en diagramas claros aprobados por los usuarios finales. |
| **R05** | **Bajo desempeño.** Lentitud del sistema web con gran volumen de datos. | **9** (3×3) - **Media** | **Mitigar** | Establecer pruebas de carga y optimizar las consultas SQL (índices, paginación) desde la etapa inicial del diseño de la base de datos. |
| **R06** | **Escasez de recursos.** Pérdida de desarrolladores clave. | **8** (2×4) - **Media** | **Transferir / Mitigar** | Mantener una documentación técnica exhaustiva del código y la arquitectura. Contar con acuerdos preestablecidos con agencias de talento externo si es necesario. |
| **R07** | **Problemas de costos.** Excedentes en infraestructura o licencias. | **6** (2×3) - **Media** | **Aceptar / Mitigar** | Definir alertas automáticas de consumo en el proveedor de nube y establecer un fondo de contingencia del 15% del presupuesto. |

---

## Paso 5: Monitoreo, Control y Herramientas

### Frecuencia de Revisión
La gestión de riesgos no es un evento único. El plan se revisará bajo el siguiente esquema:
*   **Revisiones Quincenales:** Breves revisiones de estado de los riesgos de prioridad "Media" y "Alta" durante las reuniones de planificación de sprint.
*   **Auditorías Mensuales:** Revisión integral de toda la matriz con el Comité de Riesgos para revaluar las métricas (Probabilidad e Impacto) y cerrar riesgos ya mitigados o abrir nuevos.

### Herramientas de Software Recomendadas
Para garantizar un seguimiento profesional e integrado en la ingeniería del software, se recomienda el uso de las siguientes herramientas:
1.  **Jira Software:** Ideal para vincular los riesgos técnicos directamente con epics o tareas (issues) del equipo de desarrollo, facilitando el tracking de la mitigación.
2.  **Trello:** Una excelente alternativa visual para equipos más pequeños, permitiendo usar tableros Kanban dedicados exclusivamente a mover riesgos entre los estados "Identificado", "En Mitigación" y "Resuelto".
3.  **nTask (o Asana):** Recomendado para la administración general del proyecto, facilitando tableros específicos de gestión de riesgos donde se pueda visualizar el cronograma, la asignación de responsables y los hitos de respuesta a nivel gerencial.
