# 🏛️ Arquitectura del Sistema

Este documento describe la arquitectura técnica, el stack tecnológico y los patrones de diseño utilizados en **RELOJERÍA IA**.

## 🛠️ Stack Tecnológico

| Capa | Tecnología | Propósito |
| :--- | :--- | :--- |
| **Frontend** | Next.js 15 (App Router) | Framework principal y SSR/CSR |
| **Lenguaje** | TypeScript | Tipado estático y seguridad de código |
| **Estilos** | Tailwind CSS / Vanilla CSS | Diseño moderno, responsivo y "glassmorphism" |
| **Backend** | Supabase | Base de Datos, Autenticación y API autogenerada |
| **Estado** | React Context (Auth) | Gestión global de sesión y roles |

## 🏗️ Estructura de Componentes Críticos

### 1. AuthProvider (`src/components/AuthProvider.tsx`)
Actúa como la "fuente de verdad" para la seguridad.
- Escucha cambios en `onAuthStateChange` de Supabase.
- Consulta la tabla `perfiles` para obtener el rol del usuario actual.
- Provee el contexto `user`, `rol` y `loading` a toda la aplicación.
- Redirige automáticamente al `/login` si no hay sesión activa.

### 2. Sidebar Recolector (`src/components/Sidebar.tsx`)
Genera la navegación dinámicamente:
- Filtra los elementos del menú basándose en el array `roles` definido para cada ruta.
- Implementa un **Hydration Guard** para evitar parpadeos de UI y errores de SSR.

### 3. Hydration & Stability Pattern
Para evitar errores de hidratación y asegurar que el código dependiente del navegador no se ejecute prematuramente en el servidor:
- **Mounted Guard**: Se usa un estado `mounted` en `useEffect` para condicionar el renderizado de componentes interactivos.
- **Session Pulse**: El sistema detecta el foco de la ventana (`window.onfocus`) y sincroniza los datos automáticamente para prevenir sesiones inactivas "fantasma".

## 🔐 Flujo de Seguridad (RBAC)

El sistema utiliza un modelo de **Control de Acceso Basado en Roles (RBAC)** implementado en dos niveles:

1.  **Nivel de Interfaz (Frontend):**
    - El `Sidebar` oculta módulos no autorizados.
    - Las páginas protegidas (ej. `/deudas`) contienen un `useEffect` que redirige al Home si el usuario no tiene privilegios de `admin`.
2.  **Nivel de Datos (Backend - WIP):**
    - Se recomienda el uso de **Row Level Security (RLS)** en Supabase para asegurar que un Técnico no pueda modificar tablas financieras directamente vía API, incluso si conoce la URL.

## 📁 Organización de Archivos

```text
src/
├── app/            # Rutas y páginas (Arquitectura de App Router)
│   ├── layout.tsx  # Layout global con AuthProvider y Sidebar
│   ├── page.tsx    # Dashboard principal con estadísticas
│   └── [modulos]/  # Páginas específicas por funcionalidad
├── components/     # UI reusable y lógica de layout
└── lib/            # Configuración de clientes (Supabase)
```

## 📉 Patrones de Diseño
- **Client-Side Rendering (CSR):** La mayoría de las páginas usan `"use client"` para permitir interacciones rápidas y estados de carga fluidos.
- **Atomic Design (Simplificado):** Los componentes se agrupan por su función (UI, Auth, Layout).
- **Integridad Transaccional**: Los campos como `saldo_pendiente` se calculan en el cliente y se validan en el servidor para asegurar que nunca existan descuadres financieros.
