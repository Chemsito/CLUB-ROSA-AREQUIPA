// ===== CONFIGURACION: cambia aqui los datos del negocio =====
const CONFIG = {
  whatsapp: '51963445394', // numero del negocio con codigo de pais (51 = Peru), sin + ni espacios
  sheetsUrl: 'https://script.google.com/macros/s/AKfycbzhLvFDL5h3MAcENLERUd9eIfxnSB9XmGGZIRLmTiZEd3guAYVAD0i6QZcbKZViPbs/exec', // URL de la aplicacion web de Google Apps Script (ver google-sheets/README.md); vacio = solo WhatsApp
  servicios: [
    { nombre: 'Masaje 30 min', minutos: 30, precio: 75, desc: 'Ideal para liberar tensión en espalda y cuello.' },
    { nombre: 'Masaje 1 hora', minutos: 60, precio: 135, desc: 'Relajación completa de cuerpo entero.', destacado: true },
    { nombre: 'Masaje 2 horas', minutos: 120, precio: 195, desc: 'Sesión extendida para una desconexión total.' }
  ],
  taxi: 15, // precio unico del taxi, a cualquier distrito
  masajistas: [
    { nombre: 'Valeria', especialidad: 'Relajante y descontracturante' },
    { nombre: 'Camila', especialidad: 'Relajante y piedras calientes' },
    { nombre: 'Daniela', especialidad: 'Relajante y aromaterapia' }
  ],
  distritos: [
    'Cercado', 'Yanahuara', 'Cayma', 'Miraflores', 'Mariano Melgar', 'Cerro Colorado', 'J.L. Bustamante y Rivero',
    'Sachaca', 'Paucarpata', 'Jacobo Hunter', 'Alto Selva Alegre', 'Socabaya', 'Tiabaya', 'Sabandía', 'Characato', 'Otro'
  ]
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

document.querySelectorAll('.precio-taxi').forEach(el => { el.textContent = soles(CONFIG.taxi); });

// ----- Formulario -----
const opt = (v, t = v) => `<option value="${v}">${t}</option>`;
$('#sel-servicio').innerHTML = CONFIG.servicios.map(s => opt(s.nombre, `${duracion(s.minutos)} — ${soles(s.precio)}`)).join('');
$('#sel-servicio').value = 'Masaje 1 hora';
$('#sel-distrito').innerHTML = opt('', 'Elige tu distrito') + CONFIG.distritos.map(d => opt(d)).join('');

const hoy = new Date();
const iso = d => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
$('#fecha').min = iso(hoy);
$('#fecha').value = iso(hoy);

function calcular() {
  const s = CONFIG.servicios.find(x => x.nombre === $('#sel-servicio').value);
  const precio = s ? s.precio : 0, taxi = CONFIG.taxi;
  $('#t-servicio').textContent = soles(precio);
  $('#t-taxi').textContent = soles(taxi);
  $('#t-total').textContent = soles(precio + taxi);
  return { precio, taxi, total: precio + taxi };
}
$('#sel-servicio').addEventListener('change', calcular);
calcular();

document.addEventListener('click', e => {
  const b = e.target.closest('[data-servicio],[data-masajista]');
  if (!b) return;
  if (b.dataset.servicio) $('#sel-servicio').value = b.dataset.servicio;
  if (b.dataset.masajista) $('#sel-masajista').value = b.dataset.masajista;
  calcular();
});

// ----- Direccion: escribirla, pegar un link de Google Maps o marcarla en el mapa -----
const AREQUIPA = [-16.3989, -71.5369];
let mapa = null, pin = null;
document.querySelectorAll('.tabs [data-modo]').forEach(b => b.addEventListener('click', () => {
  const modo = b.dataset.modo;
  $('#modo-ubicacion').value = modo;
  document.querySelectorAll('.tabs [data-modo]').forEach(x => x.setAttribute('aria-selected', x === b));
  document.querySelectorAll('[data-panel]').forEach(p => { p.hidden = p.dataset.panel !== modo; });
  $('#txt-direccion').textContent = modo === 'texto' ? 'Dirección y referencia' : 'Referencia (opcional)';
  $('#form').direccion.placeholder = modo === 'texto' ? 'Calle, número, referencia' : 'Ej.: casa de rejas blancas, dpto. 302';
  if (modo === 'mapa') abrirMapa();
}));

// Leaflet + OpenStreetMap: gratis y sin clave; se carga solo cuando eligen "En el mapa"
function cargarLeaflet() {
  if (window.L) return Promise.resolve();
  const css = document.createElement('link');
  Object.assign(css, { rel: 'stylesheet', href: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css', integrity: 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=', crossOrigin: '' });
  document.head.appendChild(css);
  return new Promise((ok, falla) => {
    const js = document.createElement('script');
    Object.assign(js, { src: 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js', integrity: 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=', crossOrigin: '', onload: ok, onerror: falla });
    document.head.appendChild(js);
  });
}

function marcar(lat, lng) {
  if (pin) pin.setLatLng([lat, lng]);
  else {
    pin = L.marker([lat, lng], { draggable: true }).addTo(mapa);
    pin.on('dragend', () => { const p = pin.getLatLng(); marcar(p.lat, p.lng); });
  }
  $('#mapa-estado').textContent = '✅ Ubicación marcada. Puedes arrastrar el pin para ajustarla.';
}

async function abrirMapa() {
  if (mapa) return setTimeout(() => mapa.invalidateSize(), 50);
  try {
    await cargarLeaflet();
  } catch (e) {
    $('#mapa-estado').textContent = 'No se pudo cargar el mapa. Usa el link de Maps o escribe tu dirección.';
    return;
  }
  mapa = L.map('mapa').setView(AREQUIPA, 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(mapa);
  mapa.on('click', e => marcar(e.latlng.lat, e.latlng.lng));
}

$('#mi-ubicacion').addEventListener('click', () => {
  if (!navigator.geolocation) return ($('#mapa-estado').textContent = 'Tu celular no permite compartir la ubicación. Toca el mapa.');
  $('#mapa-estado').textContent = 'Buscando tu ubicación...';
  navigator.geolocation.getCurrentPosition(async p => {
    await abrirMapa();
    if (!mapa) return;
    mapa.setView([p.coords.latitude, p.coords.longitude], 17);
    marcar(p.coords.latitude, p.coords.longitude);
  }, () => { $('#mapa-estado').textContent = 'No pudimos obtener tu ubicación. Toca el mapa para marcarla.'; }, { enableHighAccuracy: true, timeout: 15000 });
});

const esLinkMaps = u => /^https?:\/\/(maps\.app\.goo\.gl|goo\.gl\/maps|(www\.)?google\.[a-z.]+\/maps|maps\.google\.[a-z.]+)\S*$/i.test(u.trim());

// Devuelve { link, error } segun la opcion elegida
function ubicacion(f) {
  if (f.modo === 'link') {
    if (!f.link.trim()) return { error: 'Pega el link de Google Maps.' };
    if (!esLinkMaps(f.link)) return { error: 'El link no parece de Google Maps. Cópialo desde Compartir → Copiar enlace.' };
    return { link: f.link.trim() };
  }
  if (f.modo === 'mapa') {
    if (!pin) return { error: 'Marca tu ubicación en el mapa.' };
    const p = pin.getLatLng();
    return { link: `https://www.google.com/maps?q=${p.lat.toFixed(6)},${p.lng.toFixed(6)}` };
  }
  return { link: '' };
}

$('#form').addEventListener('submit', e => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  const requeridos = ['nombre', 'celular', 'fecha', 'hora', 'distrito'].concat(f.modo === 'texto' ? ['direccion'] : []);
  const faltan = requeridos.filter(k => !String(f[k] || '').trim());
  if (faltan.length) { $('#error').textContent = 'Completa: ' + faltan.join(', ') + '.'; return; }
  if (!/^\d{9}$/.test(f.celular.replace(/\D/g, '').slice(-9))) { $('#error').textContent = 'Revisa tu número de celular (9 dígitos).'; return; }
  const u = ubicacion(f);
  if (u.error) { $('#error').textContent = u.error; return; }
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
    `Distrito: ${f.distrito}`,
    u.link ? `📍 Ubicación: ${u.link}` : '',
    f.direccion ? `${u.link ? 'Referencia' : 'Dirección'}: ${f.direccion}` : '',
    f.notas ? `Notas: ${f.notas}` : '',
    `Total estimado: ${soles(t.total)} (servicio ${soles(t.precio)} + taxi ${soles(t.taxi)})`
  ].filter(Boolean).join('\n');
  window.open(`https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent(msg)}`, '_blank', 'noopener');
  // En la hoja, la columna Direccion guarda el texto y el link de ubicacion juntos
  const direccion = [f.direccion.trim(), u.link].filter(Boolean).join(' · ');
  guardarEnSheets({ ...f, direccion, fecha, taxi: t.taxi, total: t.total });
});

// Copia la reserva en Google Sheets; si falla, la reserva igual llega por WhatsApp
function guardarEnSheets(datos) {
  if (!CONFIG.sheetsUrl) return;
  fetch(CONFIG.sheetsUrl, { method: 'POST', mode: 'no-cors', body: new URLSearchParams(datos) }).catch(() => {});
}

// ----- Masajistas (lista base en CONFIG + las agregadas/editadas en la hoja MASAJISTAS de Google Sheets) -----
// Modo administracion: abre la pagina con #admin al final de la direccion para agregar, editar y subir fotos
const ADMIN = /admin/i.test(location.hash + location.search);
const CACHE_MASAJISTAS = 'clubrosa-masajistas';
const esc = t => String(t ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
let masajistas = [];

// Une la lista base con lo guardado en la hoja: la hoja manda (especialidad, foto, activa) y puede agregar nuevas
function combinar(filas) {
  const lista = CONFIG.masajistas.map(m => ({ ...m, activa: true }));
  (filas || []).forEach(f => {
    const m = lista.find(x => x.nombre.toLowerCase() === f.nombre.toLowerCase());
    if (!m) return lista.push({ ...f });
    if (f.especialidad) m.especialidad = f.especialidad;
    if (f.foto) m.foto = f.foto;
    m.activa = f.activa;
  });
  return lista.filter(m => m.activa !== false);
}

function renderMasajistas(filas) {
  masajistas = combinar(filas);
  $('#lista-masajistas').innerHTML = masajistas.map(m => `
  <article class="member" data-nombre="${esc(m.nombre)}">
    <div class="avatar${m.foto ? ' con-foto' : ''}"${m.foto ? ` style="background-image:url('${esc(m.foto)}')"` : ''}>${m.foto ? '' : esc(m.nombre[0])}</div>
    <h3>${esc(m.nombre)}</h3>
    <p>${esc(m.especialidad)}</p>
    <a href="#reservar" class="btn btn-sm" data-masajista="${esc(m.nombre)}">Solicitar a ${esc(m.nombre)}</a>
    ${ADMIN ? `<div class="admin-acciones">
      <label class="btn btn-ghost btn-sm">📷 Foto<input type="file" accept="image/*" data-foto hidden></label>
      <button type="button" class="btn btn-ghost btn-sm" data-editar>✏️ Editar</button>
      <button type="button" class="btn btn-ghost btn-sm" data-quitar>🗑️ Quitar</button>
    </div>
    <small class="estado-foto"></small>` : ''}
  </article>`).join('');
  const sel = $('#sel-masajista'), antes = sel.value;
  sel.innerHTML = opt('Cualquiera', 'Cualquiera disponible') + masajistas.map(m => opt(esc(m.nombre))).join('');
  if (masajistas.some(m => m.nombre === antes)) sel.value = antes;
}

function actualizarLista(filas) {
  renderMasajistas(filas);
  try { localStorage.setItem(CACHE_MASAJISTAS, JSON.stringify(filas)); } catch (e) {}
}
let guardadas = [];
try { guardadas = JSON.parse(localStorage.getItem(CACHE_MASAJISTAS)) || []; } catch (e) {}
renderMasajistas(guardadas);
if (CONFIG.sheetsUrl) {
  fetch(CONFIG.sheetsUrl + '?accion=masajistas').then(r => r.json()).then(r => {
    if (Array.isArray(r.masajistas)) actualizarLista(r.masajistas);
  }).catch(() => {});
}

// Envia un cambio a la hoja con la clave de administracion; la hoja responde con la lista actualizada
async function guardarMasajista(datos) {
  if (!CONFIG.sheetsUrl) throw new Error('Falta configurar sheetsUrl en script.js.');
  const clave = sessionStorage.getItem('clubrosa-clave') || prompt('Clave de administración:');
  if (!clave) throw new Error('Cancelado.');
  const r = await fetch(CONFIG.sheetsUrl, { method: 'POST', body: new URLSearchParams({ accion: 'masajista', clave, ...datos }) }).then(x => x.json());
  if (!r.ok) {
    if (r.error === 'clave') sessionStorage.removeItem('clubrosa-clave');
    throw new Error(r.error === 'clave' ? 'Clave incorrecta.' : (r.error || 'No se pudo guardar.'));
  }
  sessionStorage.setItem('clubrosa-clave', clave);
  actualizarLista(r.masajistas);
}

const estadoDe = nombre => [...document.querySelectorAll('.member')].find(a => a.dataset.nombre === nombre)?.querySelector('.estado-foto');
function aviso(el, txt, error) {
  if (!el) return;
  el.textContent = txt;
  el.classList.toggle('error', !!error);
}
// La tarjeta se vuelve a dibujar al guardar, por eso el aviso se busca de nuevo despues
async function accionTarjeta(nombre, datos, listo) {
  aviso(estadoDe(nombre), 'Guardando...');
  try {
    await guardarMasajista({ nombre, ...datos });
    aviso(estadoDe(nombre), listo);
  } catch (err) {
    aviso(estadoDe(nombre), err.message, true);
  }
}

// Recorta la imagen al centro en un cuadrado y la reduce para que quepa en una celda de la hoja (max 50.000 caracteres)
function prepararFoto(archivo) {
  return new Promise((ok, falla) => {
    const img = new Image();
    img.onload = () => {
      const lado = Math.min(img.width, img.height);
      for (const [px, calidad] of [[600, .8], [520, .75], [460, .7], [400, .65], [340, .6], [280, .5]]) {
        const c = document.createElement('canvas');
        c.width = c.height = px;
        c.getContext('2d').drawImage(img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, 0, 0, px, px);
        const datos = c.toDataURL('image/jpeg', calidad);
        if (datos.length < 45000) { URL.revokeObjectURL(img.src); return ok(datos); }
      }
      falla(new Error('La imagen es demasiado pesada.'));
    };
    img.onerror = () => falla(new Error('No se pudo leer la imagen.'));
    img.src = URL.createObjectURL(archivo);
  });
}

document.addEventListener('change', async e => {
  const input = e.target.closest('[data-foto]');
  if (!input || !input.files[0]) return;
  const nombre = input.closest('.member').dataset.nombre;
  try {
    const foto = await prepararFoto(input.files[0]);
    await accionTarjeta(nombre, { foto }, '✅ Foto guardada');
  } catch (err) {
    aviso(estadoDe(nombre), err.message, true);
  }
  input.value = '';
});

document.addEventListener('click', e => {
  const b = e.target.closest('[data-editar],[data-quitar]');
  if (!b) return;
  const nombre = b.closest('.member').dataset.nombre;
  if (b.hasAttribute('data-editar')) {
    const actual = masajistas.find(m => m.nombre === nombre)?.especialidad || '';
    const especialidad = prompt(`Especialidad de ${nombre}:`, actual);
    if (especialidad !== null && especialidad.trim() !== actual) accionTarjeta(nombre, { especialidad }, '✅ Cambios guardados');
  } else if (confirm(`¿Quitar a ${nombre} de la página? Podrás volver a agregarla con el mismo nombre.`)) {
    accionTarjeta(nombre, { activa: 'No' }, '');
  }
});

// Formulario para agregar una masajista nueva (solo en modo #admin)
if (ADMIN) {
  $('#admin-masajistas').innerHTML = `
  <form id="form-nueva" class="form admin-form" novalidate>
    <h3>➕ Agregar masajista</h3>
    <div class="row">
      <label>Nombre<input name="nombre" required maxlength="40" placeholder="Ej.: Sofía"></label>
      <label>Especialidad<input name="especialidad" maxlength="80" placeholder="Ej.: Relajante y descontracturante"></label>
    </div>
    <label>Foto de perfil (opcional)<input type="file" name="foto" accept="image/*"></label>
    <p class="estado-foto" id="estado-nueva"></p>
    <button class="btn btn-block" type="submit">Agregar masajista</button>
  </form>`;
  $('#form-nueva').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target, estado = $('#estado-nueva');
    const nombre = f.nombre.value.trim();
    if (!nombre) return aviso(estado, 'Escribe el nombre.', true);
    const datos = { nombre, especialidad: f.especialidad.value.trim(), activa: 'Si' };
    try {
      aviso(estado, 'Guardando...');
      if (f.foto.files[0]) datos.foto = await prepararFoto(f.foto.files[0]);
      await guardarMasajista(datos);
      f.reset();
      aviso(estado, `✅ ${nombre} agregada`);
    } catch (err) {
      aviso(estado, err.message, true);
    }
  });
}

const wa = `https://wa.me/${CONFIG.whatsapp}?text=${encodeURIComponent('Hola Club Rosa, quisiera información sobre los masajes a domicilio.')}`;
$('#wa-link').href = wa; $('#wa-float').href = wa;
$('#anio').textContent = hoy.getFullYear();
