# Conectar las reservas con Google Sheets

Cada reserva enviada desde la página se guarda como una fila nueva en la hoja `RESERVAS_WEB` (mismas columnas que la hoja RESERVAS_WEB del Excel), además de llegar por WhatsApp. La hoja `DASHBOARD` resume el negocio con indicadores y gráficos.

## Instalación (primera vez)
1. Crea una hoja nueva en https://sheets.new y ponle de nombre **Club Rosa - Reservas**.
2. Menú **Extensiones → Apps Script**. Borra lo que aparece y pega todo el contenido de `Code.gs`. Guarda.
3. **Implementar → Nueva implementación** → tipo **Aplicación web**:
   - Ejecutar como: **Yo**
   - Quién tiene acceso: **Cualquier persona**
4. Pulsa **Implementar**, autoriza con tu cuenta de Google y copia la **URL de la aplicación web** (termina en `/exec`).
5. Pega esa URL en `script.js`, en `sheetsUrl: '...'`, y sube el cambio.

## Crear el dashboard
1. En Apps Script, elige la función **crearDashboard** en la barra superior y pulsa **Ejecutar** (acepta los permisos si los pide).
2. Vuelve a la hoja: aparece la pestaña **DASHBOARD** como segunda hoja. Desde entonces se actualiza sola.
3. También queda el menú **🌸 Club Rosa → Crear / actualizar dashboard** para volver a dibujarlo.

Cambia la columna **Estado** de cada reserva (Nueva → Confirmada → Atendida / Cancelada) y el dashboard se recalcula.

## Actualizar el código
Usa **Implementar → Gestionar implementaciones → ✏️ Editar → Versión: Nueva versión → Implementar**: así la URL no cambia.
