/**
 * Club Rosa Arequipa - reservas de la pagina web + dashboard del negocio.
 * Instalacion: ver google-sheets/README.md
 */
const HOJA = 'RESERVAS_WEB';
const DASH = 'DASHBOARD';
const CALC = '_calc';
const COLUMNAS = ['Fecha_Solicitud', 'Cliente', 'Celular', 'Distrito', 'Direccion', 'Fecha_Servicio', 'Hora',
  'Servicio', 'Masajista_Preferida', 'Zona_Taxi', 'Total_Estimado', 'Estado', 'Notas'];
const ESTADOS = ['Nueva', 'Confirmada', 'Atendida', 'Cancelada'];
const C = { rosa: '#C2185B', osc: '#880E4F', claro: '#F8BBD0', palido: '#FCE4EC', fondo: '#FFF5F8', gris: '#7A6470', blanco: '#FFFFFF' };

// ======================= RECEPCION DE RESERVAS =======================
function doPost(e) {
  const p = (e && e.parameter) || {};
  if (p.web) return respuesta({ ok: true }); // campo trampa: solo lo llenan los bots
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const hoja = obtenerHoja();
    hoja.appendRow([
      new Date(), p.nombre, p.celular, p.distrito, p.direccion, aFecha(p.fecha), p.hora,
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

function onOpen() {
  SpreadsheetApp.getUi().createMenu('🌸 Club Rosa')
    .addItem('Crear / actualizar dashboard', 'crearDashboard')
    .addToUi();
}

function obtenerHoja() {
  const libro = SpreadsheetApp.getActiveSpreadsheet();
  let hoja = libro.getSheetByName(HOJA);
  if (!hoja) {
    hoja = libro.insertSheet(HOJA);
    hoja.appendRow(COLUMNAS);
    hoja.getRange(1, 1, 1, COLUMNAS.length).setFontWeight('bold').setBackground(C.rosa).setFontColor(C.blanco);
    hoja.setFrozenRows(1);
  }
  return hoja;
}

// "24/10/2026" -> fecha real, para que la hoja pueda calcular con ella
function aFecha(txt) {
  const m = String(txt || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  return m ? new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])) : txt;
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

// ======================= DASHBOARD =======================
function crearDashboard() {
  const libro = SpreadsheetApp.getActiveSpreadsheet();
  const reservas = obtenerHoja();
  formatearReservas(reservas);

  [DASH, CALC].forEach(n => { const h = libro.getSheetByName(n); if (h) libro.deleteSheet(h); });
  const calc = crearCalculos(libro.insertSheet(CALC));
  const dash = libro.insertSheet(DASH);

  // Orden: RESERVAS_WEB, DASHBOARD, luego el resto; _calc oculta
  libro.setActiveSheet(reservas); libro.moveActiveSheet(1);
  libro.setActiveSheet(dash); libro.moveActiveSheet(2);
  const vacia = libro.getSheets().find(h => /^(Hoja|Sheet) ?1$/.test(h.getName()) && h.getLastRow() === 0 && h.getCharts().length === 0);
  if (vacia) libro.deleteSheet(vacia);
  calc.hideSheet();

  dibujarDashboard(dash, calc);
  libro.setActiveSheet(dash);
  SpreadsheetApp.flush();
}

function formatearReservas(h) {
  h.getRange(1, 1, 1, COLUMNAS.length).setValues([COLUMNAS])
    .setFontWeight('bold').setBackground(C.rosa).setFontColor(C.blanco);
  h.setFrozenRows(1);
  h.getRange('A2:A').setNumberFormat('dd/mm/yyyy hh:mm');
  h.getRange('F2:F').setNumberFormat('dd/mm/yyyy');
  h.getRange('K2:K').setNumberFormat('"S/ "#,##0');
  h.getRange('L2:L').setDataValidation(SpreadsheetApp.newDataValidation()
    .requireValueInList(ESTADOS, true).setAllowInvalid(false).build());
  const colores = { Nueva: ['#FFF3CD', '#8A6D00'], Confirmada: ['#DCEBFF', '#1A4F8B'], Atendida: ['#DDF5E3', '#1E6B34'], Cancelada: ['#EEEEEE', '#777777'] };
  const rango = h.getRange('L2:L');
  h.setConditionalFormatRules(Object.keys(colores).map(k => SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo(k).setBackground(colores[k][0]).setFontColor(colores[k][1]).setRanges([rango]).build()));
  h.autoResizeColumns(1, COLUMNAS.length);
}

// Hoja oculta: normaliza las reservas y arma las tablas de los graficos
function crearCalculos(s) {
  const R = `'${HOJA}'!`;
  const vacio = `${R}B2:B=""`;
  const f = (celda, formula) => s.getRange(celda).setFormula(formula);

  s.getRange('A1:M1').setValues([['FechaServicio', 'Hora', 'Cliente', 'Celular', 'Distrito', 'Servicio', 'Masajista',
    'Estado', 'Total', 'FechaSolicitud', 'Comision', 'Precio', 'DiaNum']]);
  f('A2', `=ARRAYFORMULA(IF(${vacio},,IFERROR(IF(ISNUMBER(${R}F2:F),INT(${R}F2:F),DATE(RIGHT(${R}F2:F,4),MID(${R}F2:F,4,2),LEFT(${R}F2:F,2))),)))`);
  f('B2', `=ARRAYFORMULA(IF(${vacio},,IFERROR(HOUR(${R}G2:G),)))`);
  f('C2', `=ARRAYFORMULA(IF(${vacio},,${R}B2:B))`);
  f('D2', `=ARRAYFORMULA(IF(${vacio},,${R}C2:C&""))`);
  f('E2', `=ARRAYFORMULA(IF(${vacio},,IF(${R}D2:D="","Sin distrito",${R}D2:D)))`);
  f('F2', `=ARRAYFORMULA(IF(${vacio},,${R}H2:H))`);
  f('G2', `=ARRAYFORMULA(IF(${vacio},,IF(${R}I2:I="","Cualquiera",${R}I2:I)))`);
  f('H2', `=ARRAYFORMULA(IF(${vacio},,IF(${R}L2:L="","Nueva",${R}L2:L)))`);
  f('I2', `=ARRAYFORMULA(IF(${vacio},,IFERROR(${R}K2:K*1,0)))`);
  f('J2', `=ARRAYFORMULA(IF(${vacio},,IFERROR(INT(${R}A2:A),)))`);
  f('K2', '=ARRAYFORMULA(IF(C2:C="",,IF(F2:F="Masaje 30 min",5,IF(F2:F="Masaje 1 hora",10,IF(F2:F="Masaje 2 horas",15,0)))))');
  f('L2', '=ARRAYFORMULA(IF(C2:C="",,IF(F2:F="Masaje 30 min",75,IF(F2:F="Masaje 1 hora",135,IF(F2:F="Masaje 2 horas",195,0)))))');
  f('M2', '=ARRAYFORMULA(IF(C2:C="",,IFERROR(WEEKDAY(A2:A,2),)))');
  s.getRange('A2:A').setNumberFormat('yyyy-mm-dd');
  s.getRange('J2:J').setNumberFormat('yyyy-mm-dd');

  // Estados
  s.getRange('O1:P1').setValues([['Estado', 'Reservas']]);
  ESTADOS.forEach((e, i) => { s.getRange(2 + i, 15).setValue(e); s.getRange(2 + i, 16).setFormula(`=COUNTIF(H2:H,O${2 + i})`); });

  // Servicios
  s.getRange('O8:Q8').setValues([['Servicio', 'Pedidos', 'Atendidos']]);
  ['Masaje 30 min', 'Masaje 1 hora', 'Masaje 2 horas'].forEach((sv, i) => {
    const r = 9 + i;
    s.getRange(r, 15).setValue(sv);
    s.getRange(r, 16).setFormula(`=COUNTIFS(F2:F,O${r},H2:H,"<>Cancelada")`);
    s.getRange(r, 17).setFormula(`=COUNTIFS(F2:F,O${r},H2:H,"Atendida")`);
  });

  // Masajistas y distritos (dinamicos)
  s.getRange('O14:P14').setValues([['Masajista', 'Reservas']]);
  f('O15', `=IFERROR(QUERY(C2:H,"select G, count(C) where C is not null and H <> 'Cancelada' group by G order by count(C) desc limit 8 label count(C) ''",0),)`);
  s.getRange('O27:P27').setValues([['Distrito', 'Reservas']]);
  f('O28', `=IFERROR(QUERY(C2:H,"select E, count(C) where C is not null group by E order by count(C) desc limit 8 label count(C) ''",0),)`);

  // Ultimos 14 dias (por fecha en que llego la solicitud)
  s.getRange('R1:S1').setValues([['Dia', 'Reservas']]);
  for (let k = 0; k < 14; k++) {
    const r = 2 + k;
    s.getRange(r, 18).setFormula(`=TEXT(TODAY()-${13 - k},"dd/mm")`);
    s.getRange(r, 19).setFormula(`=COUNTIF(J2:J,TODAY()-${13 - k})`);
  }

  // Dia de la semana (fecha del servicio)
  s.getRange('U1:V1').setValues([['Dia', 'Reservas']]);
  ['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'].forEach((d, i) => {
    s.getRange(2 + i, 21).setValue(d);
    s.getRange(2 + i, 22).setFormula(`=COUNTIFS(M2:M,${i + 1},H2:H,"<>Cancelada")`);
  });

  // Horario
  s.getRange('X1:Y1').setValues([['Horario', 'Reservas']]);
  s.getRange('X2:X4').setValues([['Manana (antes 12:00)'], ['Tarde (12:00 - 18:00)'], ['Noche (desde 18:00)']]);
  f('Y2', '=COUNTIFS(B2:B,"<12",H2:H,"<>Cancelada")');
  f('Y3', '=COUNTIFS(B2:B,">=12",B2:B,"<18",H2:H,"<>Cancelada")');
  f('Y4', '=COUNTIFS(B2:B,">=18",H2:H,"<>Cancelada")');
  return s;
}

function dibujarDashboard(d, calc) {
  const K = `'${CALC}'!`;
  d.setHiddenGridlines(true);
  d.setColumnWidth(1, 24);
  d.setColumnWidths(2, 12, 100);
  d.setColumnWidth(14, 24);
  d.getRange('A1:N90').setBackground(C.fondo).setFontFamily('Poppins').setFontColor('#3A1F2B').setVerticalAlignment('middle');

  // Encabezado
  d.setRowHeight(1, 64);
  d.getRange('B1:M1').merge().setValue('🌸  CLUB ROSA AREQUIPA  ·  Dashboard del negocio')
    .setBackground(C.osc).setFontColor(C.blanco).setFontSize(22).setFontWeight('bold').setHorizontalAlignment('center');
  d.getRange('B2:M2').merge()
    .setFormula('="Reservas de la pagina web  ·  Actualizado: "&TEXT(NOW(),"dd/mm/yyyy hh:mm")&"  ·  Cambia el Estado en RESERVAS_WEB y todo se recalcula"')
    .setBackground(C.rosa).setFontColor(C.blanco).setFontSize(10).setHorizontalAlignment('center');
  d.setRowHeight(2, 28);
  d.setRowHeight(3, 14);

  // Tarjetas grandes
  tarjetas(d, 4, [
    ['📥 Reservas recibidas', `=COUNTIF(${K}C2:C,"?*")`, '0', 'desde la pagina web'],
    ['⏳ Por confirmar', `=COUNTIF(${K}H2:H,"Nueva")`, '0', 'llamar / escribir hoy'],
    ['📅 Confirmadas', `=COUNTIF(${K}H2:H,"Confirmada")`, '0', 'pendientes de atender'],
    ['✅ Atendidas', `=COUNTIF(${K}H2:H,"Atendida")`, '0', 'servicios realizados'],
    ['💰 Cobrado a clientes', `=SUMIFS(${K}I2:I,${K}H2:H,"Atendida")`, '"S/ "#,##0', 'servicio + taxi (atendidas)'],
    ['🏦 Comision para caja', `=SUMIFS(${K}K2:K,${K}H2:H,"Atendida")`, '"S/ "#,##0', 'S/ 5 · 10 · 15 por servicio']
  ], 30);
  d.setRowHeight(8, 14);
  tarjetas(d, 9, [
    ['🗓️ Reservas para hoy', `=COUNTIFS(${K}A2:A,TODAY(),${K}H2:H,"<>Cancelada")`, '0', ''],
    ['📆 Proximos 7 dias', `=COUNTIFS(${K}A2:A,">="&TODAY(),${K}A2:A,"<="&TODAY()+7,${K}H2:H,"<>Cancelada")`, '0', ''],
    ['🎟️ Ticket promedio', `=IFERROR(AVERAGEIFS(${K}I2:I,${K}H2:H,"<>Cancelada"),0)`, '"S/ "#,##0', ''],
    ['👩 Pago a masajistas', `=SUMIFS(${K}L2:L,${K}H2:H,"Atendida")-SUMIFS(${K}K2:K,${K}H2:H,"Atendida")`, '"S/ "#,##0', ''],
    ['❌ Cancelacion', `=IFERROR(COUNTIF(${K}H2:H,"Cancelada")/COUNTIF(${K}C2:C,"?*"),0)`, '0%', ''],
    ['⭐ Servicio favorito', `=IF(MAX(${K}P9:P11)=0,"-",SUBSTITUTE(INDEX(${K}O9:O11,MATCH(MAX(${K}P9:P11),${K}P9:P11,0)),"Masaje ",""))`, '@', '']
  ], 22);

  // Graficos
  // Cada grafico mide 320 px (~15 filas): secciones cada 18 filas
  [[14, '¿Como van las reservas?'], [32, '¿Que piden y a quien prefieren?'],
   [50, '¿Cuando y donde nos piden?'], [68, 'Horario y proximas reservas']].forEach(([r, t]) => titulo(d, r, t));
  const g = (tipo, rango, fila, col, tituloG, op) => grafico(d, calc.getRange(rango), tipo, fila, col, tituloG, op);
  g(Charts.ChartType.PIE, 'O1:P5', 15, 2, 'Estado de las reservas', { pieHole: 0.55, colors: ['#F9A825', '#42A5F5', '#43A047', '#BDBDBD'], legend: { position: 'right' }, pieSliceText: 'value' });
  g(Charts.ChartType.COLUMN, 'R1:S15', 15, 8, 'Reservas recibidas - ultimos 14 dias', { colors: [C.rosa], legend: { position: 'none' } });
  g(Charts.ChartType.COLUMN, 'O8:Q11', 33, 2, 'Servicios: pedidos vs atendidos', { colors: [C.claro, C.rosa], legend: { position: 'top' } });
  g(Charts.ChartType.BAR, 'O14:P22', 33, 8, 'Masajista preferida por los clientes', { colors: [C.osc], legend: { position: 'none' } });
  g(Charts.ChartType.COLUMN, 'U1:V8', 51, 2, 'Dia de la semana del servicio', { colors: [C.rosa], legend: { position: 'none' } });
  g(Charts.ChartType.BAR, 'O27:P35', 51, 8, 'Distritos que mas piden', { colors: ['#EC407A'], legend: { position: 'none' } });
  g(Charts.ChartType.PIE, 'X1:Y4', 69, 2, 'Horario preferido', { pieHole: 0.55, colors: [C.claro, C.rosa, C.osc], legend: { position: 'right' }, pieSliceText: 'percentage' });

  // Proximas reservas (tabla en H..M, junto al grafico de horario)
  d.getRange(69, 8, 1, 6).merge().setValue('Proximas reservas (nuevas y confirmadas)')
    .setFontWeight('bold').setFontColor(C.osc).setFontSize(12).setBackground(C.blanco).setHorizontalAlignment('center');
  d.getRange(70, 8, 1, 6).setValues([['Fecha', 'Hora', 'Cliente', 'Servicio', 'Masajista', 'Estado']])
    .setBackground(C.rosa).setFontColor(C.blanco).setFontWeight('bold').setHorizontalAlignment('center');
  d.getRange(71, 8).setFormula(
    `=IFERROR(QUERY(${K}A2:H,"select A, B, C, F, G, H where A >= date '"&TEXT(TODAY(),"yyyy-mm-dd")&"' ` +
    `and (H = 'Nueva' or H = 'Confirmada') order by A, B limit 13",0),"No hay reservas proximas")`);
  d.getRange('H71:H83').setNumberFormat('dd/mm');
  d.getRange('I71:I83').setNumberFormat('00":00"');
  d.getRange('H71:M83').setBackground(C.blanco).setFontSize(10).setHorizontalAlignment('center')
    .setBorder(null, null, true, null, null, true, C.palido, SpreadsheetApp.BorderStyle.SOLID);
  d.setFrozenRows(2);
}

function tarjetas(d, fila, items, tamano) {
  d.setRowHeight(fila, 26); d.setRowHeight(fila + 1, tamano + 26); d.setRowHeight(fila + 2, 22);
  items.forEach(([etiqueta, formula, formato, nota], i) => {
    const col = 2 + i * 2;
    const caja = d.getRange(fila, col, 3, 2);
    caja.setBackground(C.blanco).setBorder(true, true, true, true, null, null, C.claro, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
    d.getRange(fila, col, 1, 2).merge().setValue(etiqueta).setFontSize(10).setFontColor(C.gris).setHorizontalAlignment('center');
    d.getRange(fila + 1, col, 1, 2).merge().setFormula(formula).setNumberFormat(formato)
      .setFontSize(tamano).setFontWeight('bold').setFontColor(C.rosa).setHorizontalAlignment('center');
    d.getRange(fila + 2, col, 1, 2).merge().setValue(nota).setFontSize(8).setFontColor(C.gris).setHorizontalAlignment('center');
  });
}

function titulo(d, fila, texto) {
  d.setRowHeight(fila, 34);
  d.getRange(fila, 2, 1, 12).merge().setValue(texto).setFontSize(14).setFontWeight('bold').setFontColor(C.osc)
    .setBorder(null, null, true, null, null, null, C.rosa, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
}

function grafico(d, rango, tipo, fila, col, tituloG, op) {
  let b = d.newChart().setChartType(tipo).addRange(rango).setNumHeaders(1)
    .setPosition(fila, col, 4, 4)
    .setOption('title', tituloG)
    .setOption('titleTextStyle', { color: C.osc, fontSize: 14, bold: true })
    .setOption('backgroundColor', C.blanco)
    .setOption('width', 588).setOption('height', 320)
    .setOption('fontName', 'Poppins')
    .setOption('vAxis', { minValue: 0, format: '0', gridlines: { color: '#F3E5EA' } })
    .setOption('hAxis', { minValue: 0, format: '0', gridlines: { color: '#F3E5EA' } })
    .setOption('chartArea', { left: 70, top: 50, width: '78%', height: '68%' });
  Object.keys(op || {}).forEach(k => { b = b.setOption(k, op[k]); });
  d.insertChart(b.build());
}
