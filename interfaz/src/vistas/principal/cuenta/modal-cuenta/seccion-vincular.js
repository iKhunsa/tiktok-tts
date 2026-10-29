/**
 * Seccion "Vincular cuentas" del modal "Mi cuenta": pestañas Tuyos (tabla de
 * conectores vinculados) y Descubrir (tarjetas de conectores recomendados),
 * con busqueda por nombre en las dos.
 *
 * Dos mecanismos de conexion distintos, por eso `tipo` en el catalogo:
 * - 'oauth' (Twitch/Kick): OAuth real (servicio-cuentas, FASE 1 de
 *   docs/plan-twitch-kick.md) via plataforma-auth-cliente.js. Al vincular,
 *   se guarda ademas el username como canal local (plataformas.js#
 *   sincronizarCanalOAuth) -- asi "Conectar"/los iconos de Chat lo ven igual
 *   que tiktok/youtube, sin esto twitch/kick vinculados por OAuth nunca
 *   aparecian ahi (nadie vincula por OAuth la cuenta de OTRO streamer, asi
 *   que el username de la OAuth siempre es el canal correcto).
 * - 'canal' (TikTok/YouTube): sin login, se conectan por nombre de canal
 *   (mismo mecanismo que "Canales vinculados" en Ajustes, features/canales/)
 *   — pide el @usuario/canal en un modal chico (modal-agregar-canal.js) y
 *   solo GUARDA (plataformas.js#guardarCanal), nunca conecta de una.
 *
 * Estados (c.estado), independientes de `tipo`:
 * - 'sin-vincular': nada guardado/vinculado.
 * - 'guardado': hay canal (guardado o via OAuth) pero no esta conectado al
 *   LIVE ahora mismo.
 * - 'conectado': ese canal esta activo ahora mismo en Chat.
 * - 'caducado' (solo TikTok): las cookies de sesion vencieron -- requiere
 *   volver a iniciar sesion sin perder el canal guardado.
 */
import { t, aplicarTraducciones } from '../../../../nucleo/i18n/i18n.js';
import { escaparAtributo as esc } from '../../../../../compartido/escapar-html.js';
import { toastError } from '../api.js';
import { listarPlataformasVinculadas, vincularPlataforma, desvincularPlataforma } from '../plataformas-vinculadas.js';
import {
  canalGuardado, removeChannel, sincronizarCanalOAuth, obtenerCanalesEnVivo, canalEnColeccion,
} from '../../plataformas.js';
import { abrirModalAgregarCanal } from './modal-agregar-canal.js';
import { fetchTiktokSession, alCambiarSesionTiktok, tiktokLogin } from '../../tiktok-sesion.js';

// Catalogo fijo (id/nombre); el estado se pisa con el real apenas resuelve
// cargarEstadoReal().
const CATALOGO = [
  { id: 'tiktok', nombre: 'TikTok', estado: 'sin-vincular', vinculable: true, tipo: 'canal' },
  { id: 'twitch', nombre: 'Twitch', estado: 'sin-vincular', vinculable: true, tipo: 'oauth' },
  { id: 'youtube', nombre: 'Youtube', estado: 'sin-vincular', vinculable: true, tipo: 'canal' },
  { id: 'kick', nombre: 'Kick', estado: 'sin-vincular', vinculable: true, tipo: 'oauth' },
];

// Icono y texto accesible de la accion de cada tarjeta de Descubrir.
const ACCION_TARJETA = {
  'sin-vincular': { icono: 'add-white', key: 'cuentaModal.add' },
  guardado: { icono: 'check_circle_outline-ok', key: 'cuentaModal.saved' },
  conectado: { icono: 'check_circle_outline-ok', key: 'cuentaModal.connected' },
  caducado: { icono: 'refresh-warn', key: 'cuentaModal.reconnect' },
  desconectado: { icono: 'link_off-red', key: 'cuentaModal.disconnected' },
  pendiente: { icono: 'refresh-warn', key: 'cuentaModal.pending' },
};

let pestana = 'tuyos';

function estadoFilaHtml(c) {
  if (c.estado === 'caducado') {
    return `<span class="mc-estado-caducado">
      <span data-i18n="cuentaModal.actionRequired"></span>
      <button class="mc-btn-blanco" type="button" data-accion="reconectar" data-i18n="cuentaModal.reconnect"></button>
    </span>`;
  }
  if (c.estado === 'desconectado') {
    return '<button class="mc-btn-blanco" type="button" data-accion="reconectar" data-i18n="cuentaModal.reconnect"></button>';
  }
  if (c.estado === 'pendiente') return '<span class="mc-estado-pendiente" data-i18n="cuentaModal.pending"></span>';
  // Conectado/guardado: al pasar el mouse (o con foco) se ofrece desconectar.
  const labelKey = c.estado === 'guardado' ? 'cuentaModal.saved' : 'cuentaModal.connected';
  return `<button class="mc-estado-conectado" type="button" data-accion="desconectar">
    <span data-i18n="${labelKey}"></span><span data-i18n="cuentaModal.disconnect"></span>
  </button>`;
}

function filaHtml(c) {
  return `
    <div class="mc-conector" data-id="${esc(c.id)}">
      <span class="mc-conector-icono" aria-hidden="true"><img src="icons/${esc(c.id)}-logo.svg" alt=""></span>
      <span class="mc-conector-nombre">${esc(c.nombre)}${c.username ? ` <span class="mc-conector-username">@${esc(c.username.replace(/^@+/, ''))}</span>` : ''}</span>
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
  // las 4 plataformas con el estado real (OAuth o canal guardado).
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

  // GET /api/account/platforms informa twitch/kick vinculados (OAuth);
  // /api/channels dice cuales canales estan EN VIVO ahora mismo (para
  // distinguir 'guardado' de 'conectado'); la sesion de TikTok dice si hace
  // falta re-loguearse para el canal guardado ('caducado').
  async function cargarEstadoReal() {
    const [vinculadas, canalesEnVivo, sesionTiktok] = await Promise.all([
      listarPlataformasVinculadas(), obtenerCanalesEnVivo(), fetchTiktokSession(),
    ]);
    if (!cont.isConnected) return; // se cerro/cambio de seccion mientras pedia
    for (const c of conectores) {
      const guardado = c.tipo === 'oauth'
        ? vinculadas.find((p) => p.plataforma === c.id)?.username
        : canalGuardado(c.id)?.channel;
      c.username = guardado || null;
      if (!guardado) { c.estado = 'sin-vincular'; continue; }
      if (c.id === 'tiktok' && sesionTiktok.available && !sesionTiktok.loggedIn && sesionTiktok.authRequired.includes(guardado)) {
        c.estado = 'caducado';
        continue;
      }
      c.estado = canalEnColeccion(c.id, guardado, canalesEnVivo) ? 'conectado' : 'guardado';
    }
    pintarLista();
  }

  async function conectarOAuth(id, btn) {
    btn.disabled = true;
    try {
      const r = await vincularPlataforma(id);
      if (!r.ok) {
        if (r.body) toastError(r.body, 'errors.generic');
        return;
      }
      await cargarEstadoReal(); // ya resuelve c.username para id === tipo oauth
      pestana = 'tuyos';
      pintarLista();
      // Fire-and-forget: solo alimenta los iconos de Chat, no bloquea el pintado de esta fila.
      const username = conectores.find((c) => c.id === id)?.username;
      sincronizarCanalOAuth(id, username);
    } finally {
      btn.disabled = false;
    }
  }

  async function conectarCanal(id) {
    const guardo = await abrirModalAgregarCanal(id);
    if (!guardo) return;
    await cargarEstadoReal();
    pestana = 'tuyos';
    pintarLista();
  }

  async function desconectar(id, btn) {
    const tipo = conectores.find((c) => c.id === id)?.tipo;
    btn.disabled = true;
    try {
      if (tipo === 'canal') {
        await removeChannel(id);
      } else {
        const r = await desvincularPlataforma(id);
        if (!r.ok) return toastError(r.body, 'errors.generic');
        await sincronizarCanalOAuth(id, null);
      }
      await cargarEstadoReal();
    } finally {
      btn.disabled = false;
    }
  }

  // Solo TikTok hoy: reabre el login sin tocar el canal ya guardado (ver
  // criterio de aceptacion "conservar nombre de usuario y configuracion").
  async function reconectar(id, btn) {
    if (id !== 'tiktok') return;
    btn.disabled = true;
    try {
      await tiktokLogin();
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
    const conector = conectores.find((c) => c.id === id);
    if (!conector?.vinculable) return;
    if (conector.tipo === 'oauth') conectarOAuth(id, btn);
    else conectarCanal(id);
  });
  tabla.querySelector('.mc-tabla-filas').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-accion]');
    if (!btn) return;
    const id = btn.closest('.mc-conector').dataset.id;
    if (btn.dataset.accion === 'reconectar') reconectar(id, btn);
    else desconectar(id, btn);
  });

  // Si la ventana de login/logout de TikTok termina mientras esta seccion
  // esta pintada, refresca el estado sola (ver tiktok-sesion.js). `tabla` (no
  // `cont`) es el chequeo correcto de "sigo pintado": el modal reusa el
  // mismo `cont` entre secciones, asi que `cont.isConnected` seguiria dando
  // true aunque el usuario ya se fue a otra pestaña del modal.
  const desuscribirSesionTiktok = alCambiarSesionTiktok(() => {
    if (!tabla.isConnected) { desuscribirSesionTiktok(); return; }
    cargarEstadoReal();
  });

  pintarLista();
  cargarEstadoReal();
}
