# 🧪 Plan de Pruebas QA - Diseño UI/UX (Frontend)

Este documento es una matriz de pruebas de Control de Calidad (QA) diseñada para evaluar rigurosamente la interfaz de usuario, la experiencia (UX) y el comportamiento visual de la aplicación. 

**Rol:** QA Tester / Diseñador UX
**Objetivo:** Garantizar que la estética "Premium", el responsive design y la accesibilidad se mantengan intactos en cualquier dispositivo.

---

## 📱 1. Adaptabilidad (Responsive Design)
**Objetivo:** Verificar que el sistema no se rompa visualmente en distintas pantallas.

| ID Prueba | Descripción del Test | Dispositivo / Resolución | Resultado Esperado | Estado (Pasó/Falló) |
| :--- | :--- | :--- | :--- | :--- |
| **UI-RES-01** | Colapso del Sidebar | Mobile (≤ 768px) | El Sidebar debe desaparecer y convertirse en un menú hamburguesa superior. | [ ] |
| **UI-RES-02** | Grillas de Tarjetas | Tablet (768px - 1024px) | Las tarjetas de "Caja Diaria" deben pasar de 1 columna a 2 columnas. | [ ] |
| **UI-RES-03** | Grillas de Tarjetas | Desktop (≥ 1024px) | Las tarjetas deben usar 3 o 4 columnas aprovechando el espacio horizontal sin estirarse al infinito. | [ ] |
| **UI-RES-04** | Tablas de Datos (Inventario) | Mobile (≤ 768px) | Las tablas deben tener un "scroll" horizontal (`overflow-x-auto`) sin deformar el resto de la página. | [ ] |
| **UI-RES-05** | Botones de Acción (Modales) | Mobile (≤ 768px) | Los modales (ej. Nuevo Cliente) deben ocupar el 100% del ancho y no quedar cortados en la parte inferior. | [ ] |

## 🌗 2. Consistencia de Temas (Light / Dark Mode)
**Objetivo:** Validar que el contraste y los colores respeten el "Glassmorphism" en ambos modos.

| ID Prueba | Descripción del Test | Modo Evaluado | Resultado Esperado | Estado (Pasó/Falló) |
| :--- | :--- | :--- | :--- | :--- |
| **UI-THM-01** | Contraste de Texto Principal | Dark Mode | El texto principal debe ser un blanco suave (`text-neutral-100`), no blanco puro (`#FFF`) para evitar fatiga visual. | [ ] |
| **UI-THM-02** | Contraste de Texto Secundario | Light Mode | Las etiquetas pequeñas deben ser `text-neutral-500` pero legibles contra fondos grises claros (`bg-neutral-50`). | [ ] |
| **UI-THM-03** | Bordes y Separadores | Ambos | Las líneas que dividen los recibos o las tarjetas deben tener opacidad muy baja (ej. `border-neutral-800` en Dark). | [ ] |
| **UI-THM-04** | Cambio Dinámico (Flicker) | Ambos | Al cambiar el tema en `/ajustes`, la transición debe ser instantánea y sin parpadeos blancos momentáneos. | [ ] |
| **UI-THM-05** | Modales de Cristal (Blur) | Ambos | El fondo detrás de los modales debe tener el efecto de desenfoque (`backdrop-blur-md`). | [ ] |

## 🖱️ 3. Micro-interacciones y Estados de UI
**Objetivo:** Asegurar que la aplicación "reaccione" orgánicamente a las acciones del usuario.

| ID Prueba | Descripción del Test | Acción | Resultado Esperado | Estado (Pasó/Falló) |
| :--- | :--- | :--- | :--- | :--- |
| **UI-INT-01** | Hover en Botones Primarios | Hover (Pasar Mouse) | El botón debe oscurecerse/aclararse ligeramente y no debe haber saltos bruscos. | [ ] |
| **UI-INT-02** | Active State (Click) | Click (Mantener) | Los botones deben tener un ligero efecto de contracción (ej. `active:scale-95`). | [ ] |
| **UI-INT-03** | Estados de Carga (Loaders) | Guardar Formulario | Al guardar (ej. Nueva Reparación), el botón debe decir "Guardando..." y deshabilitarse para prevenir doble clic. | [ ] |
| **UI-INT-04** | Animación de Entrada | Cargar Página | El contenido principal debe tener un ligero "Fade In" o deslizamiento (`animate-in fade-in`). | [ ] |

## ⚠️ 4. Validaciones y Feedback Visual (Manejo de Errores)
**Objetivo:** Comprobar que los errores sean amigables, claros y evidentes.

| ID Prueba | Descripción del Test | Escenario | Resultado Esperado | Estado (Pasó/Falló) |
| :--- | :--- | :--- | :--- | :--- |
| **UI-ERR-01** | Error de Stock | Intentar cobrar repuesto sin stock | Debe aparecer un texto/alerta en color rojo (`text-rose-500`) indicando el faltante. | [ ] |
| **UI-ERR-02** | Campos Obligatorios | Enviar formulario vacío | Los `inputs` vacíos deben requerirse o resaltarse, sin que la app colapse (pantalla blanca). | [ ] |
| **UI-ERR-03** | Éxito en Acción Crítica | Cierre de Caja Exitoso | Debe mostrarse una alerta verde o mensaje de éxito claro antes de redirigir o cerrar el modal. | [ ] |
| **UI-ERR-04** | Pérdida de Conexión | Desactivar WiFi e intentar guardar | Supabase debe devolver error y el UI debe mostrar "Error de red" sin congelarse eternamente en "Cargando...". | [ ] |

## ♿ 5. Accesibilidad (A11y) y Tipografía
**Objetivo:** Garantizar que el sistema sea usable por cualquier persona durante largas jornadas.

| ID Prueba | Descripción del Test | Criterio | Resultado Esperado | Estado (Pasó/Falló) |
| :--- | :--- | :--- | :--- | :--- |
| **UI-ACC-01** | Tamaño de Botones Táctiles | Dispositivos Móviles | Los botones principales de acción en el móvil deben tener al menos 44px de altura. | [ ] |
| **UI-ACC-02** | Legibilidad Tipográfica | Ambos Modos | Las cifras financieras gigantes (ej. totales) deben usar `tracking-tighter` (letras más juntas) para rápido escaneo. | [ ] |
| **UI-ACC-03** | Indicadores de Estado | Daltonismo | Los estados "Pendiente" o "Entregado" no deben depender SOLO del color (rojo/verde), deben tener también un Ícono o Texto claro. | [ ] |

---
*Firma de Aprobación QA:* _________________________
*Fecha de Ejecución:* _________________________
