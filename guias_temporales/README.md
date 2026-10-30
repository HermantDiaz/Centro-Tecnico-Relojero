# 🚀 Centro Técnico Relojero — War Room Hackathon
## Guía de Coordinación para el Equipo de Desarrollo (Sprint de Emergencia)

¡Bienvenidos al War Room del proyecto! Esta carpeta temporal contiene las guías de implementación directa para que **Brian**, **Iván** y **Hermant** trabajen de forma 100% paralela durante esta noche, sin pisarse el código y garantizando que el sistema esté listo para presentar mañana.

---

### 📂 Estructura de Guías en esta Carpeta

1. 📄 **[`GUIA_BRIAN_FRONTEND_CHAT.md`](./GUIA_BRIAN_FRONTEND_CHAT.md)**  
   * **Responsable:** Brian  
   * **Misión:** Diseñar y programar el componente visual flotante del Chatbot (`ChatWidget.tsx`) con diseño moderno de relojería y conectarlo con el backend de IA.
   * **Rama Git:** `feature/chat-widget`

2. 📄 **[`GUIA_IVAN_B2C_RASTREO.md`](./GUIA_IVAN_B2C_RASTREO.md)**  
   * **Responsable:** Iván  
   * **Misión:** Crear la página web pública de seguimiento de reparaciones (`/rastreo`) para clientes y estructurar la base de conocimiento oficial del taller (`tallerKnowledge.ts`).
   * **Rama Git:** `feature/b2c-tracking`

3. 📄 **Hermant (Tech Lead):**  
   * **Misión:** Implementar el motor de IA en `/api/chat/route.ts` con Google Gemini, conectar la herramienta que consulta la tabla `reparaciones` de Supabase en tiempo real, y coordinar los *merges* finales.
   * **Rama Git:** `feature/ai-chat-api`

---

### 🛡️ Reglas de Oro para esta Noche (Cero Conflictos de Git)

1. **PROHIBIDO hacer push directo a `main`:** Todo se trabaja en la rama asignada.
2. **Archivos Aislados:** Cada integrante edita únicamente los archivos detallados en su guía.
3. **Canal de Voz en Discord:** Los 3 mantendrán micrófono abierto en la sala de voz para avisar avances, dudas y resolver cualquier detalle al instante.
4. **Sincronización Final:** A las 4:00 AM, Hermant fusionará (*merge*) las 3 ramas a `staging` y `main`, probando el flujo completo de extremo a extremo.
