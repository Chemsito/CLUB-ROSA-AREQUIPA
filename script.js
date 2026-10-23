// ===== CONFIGURACION: cambia aqui los datos del negocio =====
const CONFIG = {
  whatsapp: '51963445394', // numero del negocio con codigo de pais (51 = Peru), sin + ni espacios
  sheetsUrl: 'https://script.google.com/macros/s/AKfycbzhLvFDL5h3MAcENLERUd9eIfxnSB9XmGGZIRLmTiZEd3guAYVAD0i6QZcbKZViPbs/exec', // URL de la aplicacion web de Google Apps Script (ver google-sheets/README.md); vacio = solo WhatsApp
  servicios: [
    { nombre: 'Masaje 30 min', minutos: 30, precio: 75, desc: 'Ideal para liberar tensión en espalda y cuello.' },
    { nombre: 'Masaje 1 hora', minutos: 60, precio: 135, desc: 'Relajación completa de cuerpo entero.', destacado: true },
    { nombre: 'Masaje 2 horas', minutos: 120, precio: 195, desc: 'Sesión extendida para una desconexión total.' }
  ],
  zonas: [
    { nombre: 'Cercana', taxi: 15, desc: 'Cercado, Yanahuara, Cayma, Miraflores, Mariano Melgar' },
    { nombre: 'Media', taxi: 20, desc: 'Cerro Colorado, Bustamante y Rivero, Sachaca, Paucarpata, Hunter, Alto Selva Alegre' },
    { nombre: 'Lejana', taxi: 25, desc: 'Socabaya, Tiabaya, Sabandía, Characato y otros' }
  ],
  masajistas: [
    { nombre: 'Valeria', especialidad: 'Relajante y descontracturante' },
    { nombre: 'Camila', especialidad: 'Relajante y piedras calientes' },
    { nombre: 'Daniela', especialidad: 'Relajante y aromaterapia' }
  ],
  distritos: {
    'Cercado': 'Cercana', 'Yanahuara': 'Cercana', 'Cayma': 'Cercana', 'Miraflores': 'Cercana', 'Mariano Melgar': 'Cercana',
    'Cerro Colorado': 'Media', 'J.L. Bustamante y Rivero': 'Media', 'Sachaca': 'Media', 'Paucarpata': 'Media',
    'Jacobo Hunter': 'Media', 'Alto Selva Alegre': 'Media',
    'Socabaya': 'Lejana', 'Tiabaya': 'Lejana', 'Sabandía': 'Lejana', 'Characato': 'Lejana', 'Otro': 'Media'
  }
};

const $ = s => document.querySelector(s);
const soles = n => 'S/ ' + n.toLocaleString('es-PE');
const duracion = m => (m < 60 ? m + ' min' : m / 60 + (m === 60 ? ' hora' : ' horas'));

// ----- Render de secciones -----
$('#lista-servicios').innerHTML = CONFIG.servicios.map(s => `
  <article class="card${s.destacado ? ' featured' : ''}">
    ${s.destacado ? '<span class="badge">Más pedido</span>' : ''}
    <h3>${duracion(s.minutos)}</h3>
    <p class="price">${soles(s.precio)}</p>
    <p>${s.desc}</p>
    <a href="#reservar" class="btn btn-ghost" data-servicio="${s.nombre}">Elegir</a>
  </article>`).join('');

$('#lista-masajistas').innerHTML = CONFIG.masajistas.map(m => `
  <article class="member">
    <div class="avatar">${m.nombre[0]}</div>
    <h3>${m.nombre}</h3>
    <p>${m.especialidad}</p>
    <a href="#reservar" class="btn btn-sm" data-masajista="${m.nombre}">Solicitar a ${m.nombre}</a>
  </article>`).join('');

$('#lista-zonas').innerHTML = CONFIG.zonas.map(z => `
  <div class="zona"><b>${z.nombre}</b><span>${soles(z.taxi)}</span><small>${z.desc}</small></div>`).join('');

// ----- Formulario -----
const opt = (v, t = v) => `<option value="${v}">${t}</option>`;
$('#sel-servicio').innerHTML = CONFIG.servicios.map(s => opt(s.nombre, `${duracion(s.minutos)} — ${soles(s.precio)}`)).join('');
$('#sel-servicio').value = 'Masaje 1 hora';
$('#sel-masajista').innerHTML = opt('Cualquiera', 'Cualquiera disponible') + CONFIG.masajistas.map(m => opt(m.nombre)).join('');
$('#sel-distrito').innerHTML = opt('', 'Elige tu distrito') + Object.keys(CONFIG.distritos).map(d => opt(d)).join('');
$('#sel-zona').innerHTML = CONFIG.zonas.map(z => opt(z.nombre, `${z.nombre} — taxi ${soles(z.taxi)}`)).join('');

const hoy = new Date();
const iso = d => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
$('#fecha').min = iso(hoy);
$('#fecha').value = iso(hoy);

function calcular() {
  const s = CONFIG.servicios.find(x => x.nombre === $('#sel-servicio').value);
  const z = CONFIG.zonas.find(x => x.nombre === $('#sel-zona').value);
  const precio = s ? s.precio : 0, taxi = z ? z.taxi : 0;
  $('#t-servicio').textContent = soles(precio);
  $('#t-taxi').textContent = soles(taxi);
  $('#t-total').textContent = soles(precio + taxi);
  return { precio, taxi, total: precio + taxi };
}
$('#sel-distrito').addEventListener('change', e => {
  const zona = CONFIG.distritos[e.target.value];
  if (zona) $('#sel-zona').value = zona;
  calcular();
});
['#sel-servicio', '#sel-zona'].forEach(id => $(id).addEventListener('change', calcular));
calcular();

document.addEventListener('click', e => {
  const b = e.target.closest('[data-servicio],[data-masajista]');
  if (!b) return;
  if (b.dataset.servicio) $('#sel-servicio').value = b.dataset.servicio;
  if (b.dataset.masajista) $('#sel-masajista').value = b.dataset.masajista;
  calcular();
});

$('#form').addEventListener('submit', e => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  const faltan = ['nombre', 'celular', 'fecha', 'hora', 'distrito', 'direccion'].filter(k => !String(f[k] || '').trim());
  if (faltan.length) { $('#error').textContent = 'Completa: ' + faltan.join(', ') + '.'; return; }
  if (!/^\d{9}$/.test(f.celular.replace(/\D/g, '').slice(-9))) { $('#error').textContent = 'Revisa tu número de celular (9 dígitos).'; return; }
  $('#error').textContent = '';
  const t = calcular();
  const fecha = f.fecha.split('-').reverse().join('/');
  const msg = [
    '🌸 *NUEVA RESERVA - CLUB ROSA*',
    `Cliente: ${f.nombre}`,
    `Celular: ${f.celular}`,
    `Servicio: ${f.servicio}`,
    `Masajista: ${f.masajista}`,
    `Fecha: ${fecha}  Hora: ${f.hora}`,
    `Distrito: ${f.distrito}  (Zona ${f.zona})`,
    `Dirección: ${f.direccion}`,
    f.notas ? `Notas: ${f.notas}` : '',
    `Total estimado: ${soles(t.total)} (servicio ${soles(t.precio)} + taxi ${soles(t.taxi)})`
  ].filter(Boolean).join('\n');
  window.open(`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
  guardarEnSheets({ ...f, fecha, total: t.total });
});

// Copia la reserva en Google Sheets; si falla, la reserva igual llega por WhatsApp
function guardarEnSheets(datos) {
  if (!CONFIG.sheetsUrl) return;
  fetch(CONFIG.sheetsUrl, { method: 'POST', mode: 'no-cors', body: new URLSearchParams(datos) }).catch(() => {});
}

const wa = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent('Hola Club Rosa, quisiera información sobre los masajes a domicilio.')}`;
$('#wa-link').href = wa; $('#wa-float').href = wa;
$('#anio').textContent = hoy.getFullYear();
