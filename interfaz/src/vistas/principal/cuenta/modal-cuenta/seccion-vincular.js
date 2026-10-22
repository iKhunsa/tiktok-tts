/**
 * Seccion "Vincular cuentas" del modal "Mi cuenta": pestañas Tuyos (tabla de
 * conectores vinculados) y Descubrir (tarjetas de conectores recomendados),
 * con busqueda por nombre en las dos.
 * Solo interfaz por ahora: CONECTORES_EJEMPLO reemplaza los datos reales y los
 * botones de accion todavia no hacen nada (los conecta el back).
 */
import { t, aplicarTraducciones } from '../../../../nucleo/i18n/i18n.js';
import { escaparAtributo as esc } from '../../../../../compartido/escapar-html.js';

// estado: 'sin-vincular' | 'conectado' | 'caducado' | 'desconectado' | 'pendiente'.
// Tuyos muestra todo lo que no esta 'sin-vincular'.
const CONECTORES_EJEMPLO = [
  { id: 'tiktok', nombre: 'TikTok', estado: 'sin-vincular' },
  { id: 'twitch', nombre: 'Twitch', estado: 'desconectado' },
  { id: 'youtube', nombre: 'Youtube', estado: 'caducado' },
  { id: 'kick', nombre: 'Kick', estado: 'conectado' },
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
    <div class="mc-conector">
      <span class="mc-conector-icono" aria-hidden="true"><img src="icons/${esc(c.id)}-logo.svg" alt=""></span>
      <span class="mc-conector-nombre">${esc(c.nombre)}</span>
      <span class="mc-conector-estado">${estadoFilaHtml(c)}</span>
    </div>`;
}

function tarjetaHtml(c) {
  const accion = ACCION_TARJETA[c.estado];
  return `
    <div class="mc-tarjeta">
      <span class="mc-tarjeta-logo"><img src="icons/${esc(c.id)}-logo.svg" alt=""></span>
      <div class="mc-tarjeta-texto">
        <div class="mc-tarjeta-nombre">${esc(c.nombre)}</div>
        <p class="mc-tarjeta-desc" data-i18n="cuentaModal.desc_${esc(c.id)}"></p>
      </div>
      <button class="mc-tarjeta-accion" type="button" data-i18n-title="${accion.key}" aria-label="${esc(t(accion.key))}">
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

  const pintarLista = () => {
    for (const tab of cont.querySelectorAll('.mc-tab')) {
      const activa = tab.dataset.pestana === pestana;
      tab.classList.toggle('is-active', activa);
      tab.setAttribute('aria-selected', String(activa));
    }
    const filtro = input.value.trim().toLocaleLowerCase();
    const enDescubrir = pestana === 'descubrir';
    const lista = CONECTORES_EJEMPLO
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
  pintarLista();
}
