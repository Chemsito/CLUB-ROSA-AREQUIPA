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

$('#lista-zonas').innerHTML = CONFIG.zonas.map(z => `
  <div class="zona"><b>${z.nombre}</b><span>${soles(z.taxi)}</span><small>${z.desc}</small></div>`).join('');

// ----- Formulario -----
const opt = (v, t = v) => `<option value="${v}">${t}</option>`;
$('#sel-servicio').innerHTML = CONFIG.servicios.map(s => opt(s.nombre, `${duracion(s.minutos)} — ${soles(s.precio)}`)).join('');
$('#sel-servicio').value = 'Masaje 1 hora';
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
