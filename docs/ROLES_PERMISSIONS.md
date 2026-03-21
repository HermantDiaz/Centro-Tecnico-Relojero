# 🔑 Roles y Permisos

El sistema utiliza **Control de Acceso Basado en Roles (RBAC)** para garantizar que cada miembro del equipo acceda únicamente a las funciones necesarias para su trabajo.

## 👥 Niveles de Acceso

| Módulo | Administrador (Admin) | Recepcionista (Recepcion) | Técnico (Tecnico) |
| :--- | :---: | :---: | :---: |
| **Dashboard** | ✅ Total | ✅ Parcial | ✅ Parcial |
| **Gestión de Equipo** | ✅ Sí | ❌ No | ❌ No |
| **Inventario (Lectura)** | ✅ Sí | ✅ Sí | ✅ Sí |
| **Inventario (Escritura)** | ✅ Sí | ✅ Sí | ❌ No |
| **Caja / Finanzas** | ✅ Sí | ❌ No | ❌ No |
| **Deudas** | ✅ Sí | ❌ No | ❌ No |
| **Reparaciones (Nueva)** | ✅ Sí | ✅ Sí | ❌ No |
| **Reparaciones (Seguimiento)** | ✅ Sí | ✅ Sí | ✅ Sí |

---

## 🏛️ Detalle de Roles

### 1. 🔥 Administrador (Admin)
Tiene control absoluto sobre el sistema. Es el único que puede:
- Ver métricas financieras reales (Ingresos, Gastos, Flujo de Caja).
- Gestionar (Crear, Editar, Eliminar) el equipo de trabajo.
- Modificar precios de compra y venta en el inventario.

### 2. 💼 Recepcionista (Recepcion)
Enfocado en la atención al cliente y la entrada de productos. Sus funciones incluyen:
- Registrar nuevos productos o relojes nuevos/usados en el inventario.
- Crear tickets de reparación (Ingreso de relojes al taller).
- Consultar estados para informar a los clientes.
- *Nota: No tiene acceso a módulos financieros ni de personal.*

### 3. ⚙️ Técnico Especialista (Tecnico)
Su acceso está optimizado para la operatividad del taller:
- Consultar el inventario de repuestos para su uso en diagnósticos.
- Ver y actualizar el estado de reparaciones asignadas.
- *Nota: Su interfaz es más limpia, ocultando botones de "Nuevo Producto", "Eliminar" o "Finanzas".*

---

## 🛡️ Implementación Técnica

La seguridad se maneja mediante:
1.  **Sidebar Dinámico:** El menú lateral filtra los enlaces según el `rol` almacenado en el `AuthProvider`.
2.  **Protección de Rutas:** Las páginas sensibles verifican el `rol` del usuario y redirigen si es necesario.
3.  **Filtrado de UI:** Botones específicos (ej. "➕ Nuevo Producto") se ocultan usando condicionales `rol !== 'tecnico'`.
