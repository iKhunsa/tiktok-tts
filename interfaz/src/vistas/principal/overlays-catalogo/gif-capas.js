import { DEFAULTS_OVERLAYS, ESQUEMAS } from '../../../../compartido/estilo/esquemas.js';
import { DEFAULTS_GIF, ESQUEMA_GIF, esCapaGif } from '../../../../compartido/estilo/campos-gif.js';
import { appSettings } from '../../../nucleo/estado/ajustes-app.js';
import { aplicarTraducciones } from '../../../nucleo/i18n/i18n.js';
import { copyCfgUrl, updateOverlayUrl } from '../configurador-overlays.js';
import { crearBotonRestablecer, montarCamposOverlay } from '../campos-overlay/montar.js';
import { sincronizarCamposOverlay } from '../campos-overlay/sincronizar.js';

// Una capa GIF es un overlay mas para el editor de canvas (overlay-gif.html): tiene su esquema, sus ajustes en
// appSettings.overlays['gif:<id>'] y una tarjeta con inspector. La tarjeta es virtual (oculta, no esta en el
// catalogo de 25): el editor la usa como a las demas para sacar el titulo, la URL de la vista y el inspector.

export const idCapaGif = (idGif) => `gif:${idGif}`;

/** Direccion absoluta del GIF (OBS no resuelve rutas relativas): el enlace original o el archivo local servido por la app. */
export const srcAbsoluta = (item) => (item.modo === 'enlace' ? item.url : new URL(item.src, window.location.origin).href);

function elemento(etiqueta, clase, atributos = {}) {
  const el = document.createElement(etiqueta);
  if (clase) el.className = clase;
  Object.entries(atributos).forEach(([nombre, valor]) => el.setAttribute(nombre, valor));
  return el;
}

function crearTarjeta(id) {
  const tarjeta = elemento('div', 'cfg-card', { 'data-ovl-id': id, hidden: '' });
  const icono = elemento('img', '', { src: 'icons/gif.svg', alt: '' });
  const titulo = elemento('div', 'cfg-title', { 'data-i18n': 'gifs.capaGif' });
  const subtitulo = elemento('div', 'cfg-subtitle', { 'data-i18n': 'gifs.capaGifDesc' });
  const meta = elemento('div', 'cfg-meta');
  meta.append(titulo, subtitulo);
  const cabecera = elemento('div', 'cfg-header');
  cabecera.append(elemento('div', 'cfg-icon'), meta);
  cabecera.firstChild.append(icono);
  // Nunca carga: la vista del editor es su propio iframe; este solo guarda la URL (data-url) que el editor lee.
  const vista = elemento('iframe', 'cfg-preview', { 'data-preview': id, hidden: '', tabindex: '-1', 'aria-hidden': 'true' });

  const inspector = elemento('div', 'ovl-inspector');
  const general = elemento('details', 'cfg-grupo');
  general.open = true;
  const resumen = elemento('summary', 'cfg-grupo-titulo');
  resumen.append(elemento('span', '', { 'data-i18n': 'overlayCfg.grupo.general' }), crearBotonRestablecer(id, 'base'));
  general.append(resumen, elemento('div', 'cfg-fields', { 'data-campos-base': id }));
  const url = elemento('div', 'edi-gif-url');
  const copiar = elemento('button', 'cfg-btn', { type: 'button' });
  copiar.append(elemento('img', 'icon-inline', { src: 'icons/content_copy.svg', alt: '' }), elemento('span', '', { 'data-i18n': 'gifs.copiarUrlObs' }));
  copiar.addEventListener('click', () => copyCfgUrl(id));
  url.append(copiar);
  inspector.append(general, elemento('div', 'cfg-personalizar', { 'data-campos-panel': id }), url);
  tarjeta.append(cabecera, vista, inspector);
  document.getElementById('ovlTarjetas').append(tarjeta);
  return tarjeta;
}

/**
 * Deja lista la capa `id`: ajustes, esquema, tarjeta e inspector. Con `src` crea o actualiza la capa; sin el solo
 * recupera una ya guardada (al cargar una escena). Devuelve false si no es una capa GIF o no hay de donde sacarla.
 */
export function prepararCapaGif(id, src) {
  if (!esCapaGif(id)) return false;
  const guardado = appSettings.overlays[id];
  if (!guardado && !src) return false;
  appSettings.overlays[id] = { ...JSON.parse(JSON.stringify(DEFAULTS_GIF)), ...guardado, ...(src ? { src } : {}) };
  // El esquema y los defaults de cada capa son el de GIF: asi el editor, los campos y el restablecer las tratan como a cualquier overlay.
  ESQUEMAS[id] = ESQUEMA_GIF;
  DEFAULTS_OVERLAYS[id] = { ...DEFAULTS_GIF, src: appSettings.overlays[id].src };
  if (!document.querySelector(`#ovlTarjetas [data-ovl-id="${id}"]`)) {
    const tarjeta = crearTarjeta(id);
    montarCamposOverlay(id);
    aplicarTraducciones(tarjeta);
  }
  sincronizarCamposOverlay(id);
  updateOverlayUrl(id);
  return true;
}

// Restablecer de fabrica rehace los ajustes: los campos de la capa (que applySettings no repinta) se ponen al dia aqui.
document.addEventListener('overlay:restablecido', ({ detail: { type } }) => {
  if (!esCapaGif(type) || !appSettings.overlays[type]) return;
  sincronizarCamposOverlay(type);
  updateOverlayUrl(type);
});
