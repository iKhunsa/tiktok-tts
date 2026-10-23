/**
 * Seccion "Vincular cuentas" del modal "Mi cuenta": pestañas Tuyos (tabla de
 * conectores vinculados) y Descubrir (tarjetas de conectores recomendados),
 * con busqueda por nombre en las dos.
 *
 * Twitch/Kick son los unicos con OAuth real (servicio-cuentas, FASE 1 de
 * docs/plan-twitch-kick.md): "Descubrir" dispara el baile OAuth
 * (plataforma-auth-cliente.js, loopback local) y linkea contra el backend;
 * "Tuyos" refleja el estado real (GET /api/account/platforms) y desvincula.
 * TikTok/YouTube no tienen vinculacion de cuenta en este proyecto (se
 * conectan por nombre de canal, sin login, en features/canales/) -- quedan
 * fijos en 'sin-vincular', solo para completar el catalogo de "Descubrir".
 */
import { t, aplicarTraducciones } from '../../../../nucleo/i18n/i18n.js';
import { escaparAtributo as esc } from '../../../../../compartido/escapar-html.js';
import { toastError } from '../api.js';
import { listarPlataformasVinculadas, vincularPlataforma, desvincularPlataforma } from '../plataformas-vinculadas.js';

// Catalogo fijo (id/nombre); el estado de twitch/kick se pisa con el real
// apenas resuelve cargarEstadoReal(). 'caducado'/'pendiente' quedan
// declarados en ACCION_TARJETA para cuando el backend exponga expiracion de
// token -- hoy el estado real es binario (conectado / sin-vincular).
const CATALOGO = [
  { id: 'tiktok', nombre: 'TikTok', estado: 'sin-vincular', vinculable: false },
  { id: 'twitch', nombre: 'Twitch', estado: 'sin-vincular', vinculable: true },
  { id: 'youtube', nombre: 'Youtube', estado: 'sin-vincular', vinculable: false },
  { id: 'kick', nombre: 'Kick', estado: 'sin-vincular', vinculable: true },
];

// Icono y texto accesible de la accion de cada tarjeta de Descubrir.
const ACCION_TARJETA = {
  'sin-vincular': { icono: 'add-white', key: 'cuentaModal.add' },
  conectado: { icono: 'check_circle_outline-ok', key: 'cuentaModal.connected' },
  caducado: { icono: 'refresh-warn', key: 'cuentaModal.reconnect' },
  desconectado: { icono: 'link_off-red', key: 'cuentaModal.disconnected' },
  pendiente: { icono: 'refresh-warn', key: 'cuentaModal.pending' },
};

let pestana = 'tuyos';

function estadoFilaHtml(c) {
  if (c.estado === 'caducado' || c.estado === 'desconectado') {
    return '<button class="mc-btn-blanco" type="button" data-i18n="cuentaModal.reconnect"></button>';
  }
  if (c.estado === 'pendiente') return '<span class="mc-estado-pendiente" data-i18n="cuentaModal.pending"></span>';
  // Conectado: al pasar el mouse (o con foco) se ofrece desconectar.
  return `<button class="mc-estado-conectado" type="button">
    <span data-i18n="cuentaModal.connected"></span><span data-i18n="cuentaModal.disconnect"></span>
  </button>`;
}

function filaHtml(c) {
  return `
    <div class="mc-conector" data-id="${esc(c.id)}">
      <span class="mc-conector-icono" aria-hidden="true"><img src="icons/${esc(c.id)}-logo.svg" alt=""></span>
      <span class="mc-conector-nombre">${esc(c.nombre)}${c.username ? ` <span class="mc-conector-username">@${esc(c.username)}</span>` : ''}</span>
      <span class="mc-conector-estado">${estadoFilaHtml(c)}</span>
    </div>`;
}

function tarjetaHtml(c) {
  const accion = ACCION_TARJETA[c.estado];
  return `
    <div class="mc-tarjeta" data-id="${esc(c.id)}">
      <span class="mc-tarjeta-logo"><img src="icons/${esc(c.id)}-logo.svg" alt=""></span>
      <div class="mc-tarjeta-texto">
        <div class="mc-tarjeta-nombre">${esc(c.nombre)}</div>
        <p class="mc-tarjeta-desc" data-i18n="cuentaModal.desc_${esc(c.id)}"></p>
      </div>
      <button class="mc-tarjeta-accion"${c.vinculable ? '' : ' disabled'} type="button" data-i18n-title="${accion.key}" aria-label="${esc(t(accion.key))}">
        <img src="icons/${accion.icono}.svg" alt="">
      </button>
    </div>`;
}

export function pintarVincular(cont) {
  const titulo = cont.querySelector('.mc-titulo');
  titulo.classList.add('mc-titulo-grande');
  cont.insertAdjacentHTML('beforeend', `
    <div class="mc-cabecera">
      <div class="mc-tabs" role="tablist">
        <button class="mc-tab" type="button" role="tab" data-pestana="tuyos" data-i18n="cuentaModal.tabTuyos"></button>
        <button class="mc-tab" type="button" role="tab" data-pestana="descubrir" data-i18n="cuentaModal.tabDescubrir"></button>
      </div>
      <label class="mc-buscar">
        <img src="icons/search.svg" alt="">
        <input type="search" data-i18n-placeholder="cuentaModal.search">
      </label>
      <button class="mc-eliminar mc-agregar" type="button" data-i18n="cuentaModal.add"></button>
    </div>
    <div class="mc-tabla">
      <div class="mc-tabla-cabecera"><span data-i18n="cuentaModal.colConnector"></span><span data-i18n="cuentaModal.colStatus"></span></div>
      <div class="mc-tabla-filas"></div>
    </div>
    <div class="mc-descubrir">
      <h3 class="mc-descubrir-titulo"><span data-i18n="cuentaModal.recommended"></span><span class="mc-descubrir-total"></span></h3>
      <div class="mc-tarjetas"></div>
    </div>
    <p class="mc-vacio" data-i18n="cuentaModal.noResults" hidden></p>`);
  cont.querySelector('.mc-cabecera').prepend(titulo);
  aplicarTraducciones(cont);

  const input = cont.querySelector('.mc-buscar input');
  input.setAttribute('aria-label', t('cuentaModal.search'));
  const tabla = cont.querySelector('.mc-tabla');
  const descubrir = cont.querySelector('.mc-descubrir');
  const vacio = cont.querySelector('.mc-vacio');

  // Copia mutable del catalogo: cargarEstadoReal() pisa estado/username de
  // twitch/kick con lo que diga el backend. tiktok/youtube no cambian nunca
  // (vinculable: false, ver nota de CATALOGO).
  let conectores = CATALOGO.map((c) => ({ ...c }));

  const pintarLista = () => {
    for (const tab of cont.querySelectorAll('.mc-tab')) {
      const activa = tab.dataset.pestana === pestana;
      tab.classList.toggle('is-active', activa);
      tab.setAttribute('aria-selected', String(activa));
    }
    const filtro = input.value.trim().toLocaleLowerCase();
    const enDescubrir = pestana === 'descubrir';
    const lista = conectores
      .filter((c) => enDescubrir || c.estado !== 'sin-vincular')
      .filter((c) => c.nombre.toLocaleLowerCase().includes(filtro));

    const destino = enDescubrir ? descubrir.querySelector('.mc-tarjetas') : tabla.querySelector('.mc-tabla-filas');
    destino.innerHTML = lista.map(enDescubrir ? tarjetaHtml : filaHtml).join('');
    aplicarTraducciones(destino);
    descubrir.querySelector('.mc-descubrir-total').textContent = String(lista.length);
    tabla.hidden = enDescubrir || !lista.length;
    descubrir.hidden = !enDescubrir || !lista.length;
    vacio.hidden = lista.length > 0;
  };

  // GET /api/account/platforms solo informa twitch/kick vinculados; el resto
  // del catalogo se queda en 'sin-vincular' tal cual sale de CATALOGO.
  async function cargarEstadoReal() {
    const vinculadas = await listarPlataformasVinculadas();
    if (!cont.isConnected) return; // se cerro/cambio de seccion mientras pedia
    for (const c of conectores) {
      if (!c.vinculable) continue;
      const v = vinculadas.find((p) => p.plataforma === c.id);
      c.estado = v ? 'conectado' : 'sin-vincular';
      c.username = v?.username || null;
    }
    pintarLista();
  }

  async function conectar(id, btn) {
    btn.disabled = true;
    try {
      const r = await vincularPlataforma(id);
      if (!r.ok) {
        if (r.body) toastError(r.body, 'errors.generic');
        return;
      }
      await cargarEstadoReal();
      pestana = 'tuyos';
      pintarLista();
    } finally {
      btn.disabled = false;
    }
  }

  async function desconectar(id, btn) {
    btn.disabled = true;
    try {
      const r = await desvincularPlataforma(id);
      if (!r.ok) return toastError(r.body, 'errors.generic');
      await cargarEstadoReal();
    } finally {
      btn.disabled = false;
    }
  }

  cont.querySelector('.mc-tabs').addEventListener('click', (e) => {
    const tab = e.target.closest('.mc-tab');
    if (!tab) return;
    pestana = tab.dataset.pestana;
    pintarLista();
  });
  input.addEventListener('input', pintarLista);
  cont.querySelector('.mc-agregar').addEventListener('click', () => {
    pestana = 'descubrir';
    pintarLista();
    input.focus();
  });

  descubrir.querySelector('.mc-tarjetas').addEventListener('click', (e) => {
    const btn = e.target.closest('.mc-tarjeta-accion');
    if (!btn || btn.disabled) return;
    const id = btn.closest('.mc-tarjeta').dataset.id;
    if (conectores.find((c) => c.id === id)?.vinculable) conectar(id, btn);
  });
  tabla.querySelector('.mc-tabla-filas').addEventListener('click', (e) => {
    const btn = e.target.closest('.mc-estado-conectado');
    if (!btn) return;
    const id = btn.closest('.mc-conector').dataset.id;
    desconectar(id, btn);
  });

  pintarLista();
  cargarEstadoReal();
}
