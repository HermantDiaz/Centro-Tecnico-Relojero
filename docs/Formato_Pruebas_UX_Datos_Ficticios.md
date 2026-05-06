# 🧪 Reporte de Pruebas de Diseño UX/UI (Ejemplo Práctico con Datos Ficticios)

*Nota: Este documento ha sido generado con fines demostrativos utilizando **datos 100% ficticios** para ilustrar cómo se debe rellenar correctamente el formato de validación de usabilidad y diseño.*

---

## 💻 1. Información del Entorno de Pruebas

| Parámetro | Detalle |
| :--- | :--- |
| **Fecha de Ejecución** | 03 de Mayo de 2026 |
| **Tester (Ficticio)** | Laura Martínez (UX Researcher) |
| **Sistema Operativo** | iOS 17.4 |
| **Dispositivo Ficticio** | iPhone 15 Pro Max |
| **Navegador** | Safari Mobile |
| **Resolución Pantalla** | 430 x 932 px |

---

## ✅ 2. Lista de Chequeo de Diseño (Los 5 Pilares)

Se evalúa la interfaz basándose en principios de diseño centrados en la conversión y la usabilidad, no en la funcionalidad técnica del código.

### 2.1. Consistencia Visual
- [x] Los colores principales coinciden con la paleta de la marca (Azul Marino y Dorado).
- [ ] Todos los botones de acción principal (Call to Action) tienen el mismo radio de borde (`rounded-full`). *(Fallo detectado)*
- [x] La familia tipográfica (Inter) es la misma en toda la aplicación.

### 2.2. Usabilidad
- [x] El menú principal (Sidebar) es fácilmente accesible con el pulgar.
- [x] Los botones táctiles en dispositivos móviles miden como **mínimo 44x44px** para evitar toques accidentales.
- [ ] El camino hacia la creación de una "Nueva Reparación" requiere menos de 3 clics. *(Fallo detectado)*

### 2.3. Jerarquía de Información
- [x] El "Total a Pagar" destaca en un tamaño mucho mayor (`text-4xl`) que el detalle del recibo.
- [x] Los títulos de las secciones son visualmente más pesados (`font-black`) que el cuerpo de texto.
- [x] Los botones secundarios tienen menos peso visual (sin fondo, solo contorno) que el botón primario de "Cobrar".

### 2.4. Adaptabilidad
- [x] Las tablas de inventario hacen scroll horizontal sin deformar la pantalla del celular.
- [x] Los textos no se cortan ni se montan unos sobre otros en pantallas pequeñas.

### 2.5. Feedback de Usuario
- [x] Aparece una animación ("Guardando...") inmediatamente al hacer clic en un botón importante.
- [ ] El sistema muestra un Toast o Notificación verde confirmando que se guardó exitosamente antes de cambiar de pantalla. *(Fallo detectado)*

---

## 🏃‍♀️ 3. Escenarios de Prueba de Usuario (Flujos de Conversión)

**Escenario 1: Búsqueda y Selección Rápida**
- **Objetivo:** Medir el flujo de búsqueda de un repuesto crítico durante una venta rápida.
- **Flujo Esperado:** Usuario entra a Inventario > Escribe en la barra de búsqueda > Toca el ícono "+" > Agrega al carrito.
- **Resultado Ficticio:** El usuario tardó 8 segundos. El ícono de "+" está demasiado pegado al borde derecho y provocó que el tester tocara por error otro elemento 2 de 5 veces.

---

## 🐛 4. Reporte de Hallazgos (Bug Report Ficticio)

A continuación, se listan las fricciones de diseño encontradas durante la prueba con pasos exactos para reproducirlas.

### Hallazgo #1: Inconsistencia en Botones de Módulos
- **ID de Error:** UX-BUG-001
- **Prioridad:** 🟠 Media
- **Descripción:** El botón de "Nuevo Cliente" tiene bordes cuadrados, mientras que todos los demás botones del sistema tienen bordes redondeados. Esto rompe la consistencia visual.
- **Pasos para reproducir:**
  1. Iniciar sesión y navegar al módulo `/clientes`.
  2. Observar el botón azul en la esquina superior derecha.
- **Evidencia Visual:** *(Imagina aquí una captura de pantalla marcando un botón cuadrado rojo vs un botón redondo verde).*
- **Recomendación:** Aplicar la clase `.rounded-[2rem]` al componente del botón.

### Hallazgo #2: Fricción Táctil en Celulares (Usabilidad)
- **ID de Error:** UX-BUG-002
- **Prioridad:** 🔴 Crítica
- **Descripción:** El botón de "Borrar" (Ícono de Basurero) en la tabla de facturación móvil mide 24x24px, incumpliendo el criterio de accesibilidad de 44x44px, provocando que se borren ítems por accidente.
- **Pasos para reproducir:**
  1. Abrir la app en Safari Mobile (iPhone 15).
  2. Agregar dos repuestos a la lista de ventas.
  3. Intentar borrar el primer repuesto con el pulgar.
- **Evidencia Visual:** *(Imagina una captura donde el pulgar del usuario tapa 3 botones pequeños a la vez).*
- **Recomendación:** Aumentar el padding (`p-4`) de las celdas de acción en la vista móvil.

### Hallazgo #3: Falta de Feedback de Éxito
- **ID de Error:** UX-BUG-003
- **Prioridad:** 🟡 Baja
- **Descripción:** Al cambiar el "Modo Oscuro" en la pantalla de Ajustes, el color cambia, pero no hay ningún mensaje que diga "Preferencias guardadas". El usuario duda si se guardó permanentemente.
- **Pasos para reproducir:**
  1. Ir a la ruta `/ajustes`.
  2. Hacer clic en "Modo Oscuro".
- **Evidencia Visual:** *(Video ficticio mostrando el clic sin respuesta de texto).*
- **Recomendación:** Implementar una alerta verde breve que diga "Preferencia Visual Guardada".
