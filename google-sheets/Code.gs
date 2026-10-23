/**
 * Club Rosa Arequipa - recibe las reservas de la pagina web y las guarda en esta hoja.
 * Instalacion: ver google-sheets/README.md
 */
const HOJA = 'RESERVAS_WEB';
const COLUMNAS = ['Fecha_Solicitud', 'Cliente', 'Celular', 'Distrito', 'Direccion', 'Fecha_Servicio', 'Hora',
  'Servicio', 'Masajista_Preferida', 'Zona_Taxi', 'Total_Estimado', 'Estado', 'Notas'];

function doPost(e) {
  const p = (e && e.parameter) || {};
  if (p.web) return respuesta({ ok: true }); // campo trampa: solo lo llenan los bots
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const hoja = obtenerHoja();
    hoja.appendRow([
      new Date(), p.nombre, p.celular, p.distrito, p.direccion, p.fecha, p.hora,
      p.servicio, p.masajista, p.zona, Number(p.total) || 0, 'Nueva', p.notas
    ].map(limpiar));
    return respuesta({ ok: true });
  } finally {
    lock.releaseLock();
  }
}

// Permite comprobar en el navegador que la URL del script funciona
function doGet() {
  return respuesta({ ok: true, hoja: HOJA });
}

function obtenerHoja() {
  const libro = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = libro.getSheetByName(HOJA);
  if (!hoja) {
    hoja = libro.insertSheet(HOJA);
    hoja.appendRow(COLUMNAS);
    hoja.getRange(1, 1, 1, COLUMNAS.length).setFontWeight('bold').setBackground('#c2185b').setFontColor('#ffffff');
    hoja.setFrozenRows(1);
  }
  return hoja;
}

// Evita que un texto enviado desde la web se ejecute como formula en la hoja
function limpiar(v) {
  if (v === undefined || v === null) return '';
  if (typeof v === 'string' && /^[=+\-@]/.test(v)) return "'" + v;
  return v;
}

function respuesta(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
