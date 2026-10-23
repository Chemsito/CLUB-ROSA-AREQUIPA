# Conectar las reservas con Google Sheets

Cada reserva enviada desde la página se guarda como una fila nueva en la hoja `RESERVAS_WEB` (mismas columnas que la hoja RESERVAS_WEB del Excel), además de llegar por WhatsApp.

1. Crea una hoja nueva en https://sheets.new y ponle de nombre **Club Rosa - Reservas**.
2. Menú **Extensiones → Apps Script**. Borra lo que aparece y pega todo el contenido de `Code.gs`. Guarda.
3. **Implementar → Nueva implementación** → tipo **Aplicación web**:
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier persona**
4. Pulsa **Implementar**, autoriza con tu cuenta de Google y copia la **URL de la aplicación web** (termina en `/exec`).
5. Pega esa URL en `script.js`, en `sheetsUrl: '...'`, y sube el cambio.

Si más adelante cambias el código, usa **Implementar → Gestionar implementaciones → Editar → Nueva versión**: así la URL no cambia.
