import { aplicarTraducciones } from '../../../nucleo/i18n/i18n.js';
import { appSettings, saveSettings } from '../../../nucleo/estado/ajustes-app.js';
import { updateOverlayUrl } from '../configurador-overlays.js';
import { sincronizarCamposOverlay } from '../campos-overlay/sincronizar.js';
import { listarGifs } from '../gif-buscador/api.js';
import { permitirArrastreGif } from '../gif-buscador/arrastrar-gif.js';
import { formatoActual } from '../lienzo-overlay.js';
import { idCapaGif, prepararCapaGif, srcAbsoluta } from './gif-capas.js';

const ANCHO_BASE = 0.2; // fraccion del ancho de la fuente que ocupa una capa GIF a tamano 100 % (overlay-gif.html)
const limitar = (valor) => Math.min(1, Math.max(-1, Math.round(valor * 1000) / 1000));

function elemento(etiqueta, clase, texto) {
  const el = document.createElement(etiqueta);
  if (clase) el.className = clase;
  if (texto !== undefined) el.textContent = texto;
  return el;
}

/**
 * Pestana GIF de la biblioteca del editor: los GIFs de "Mis GIFs", listos para llevarlos al canvas. Cada uno se
 * convierte en su propia capa: con un clic aparece en el centro, y arrastrandolo, donde se suelte.
 * `agregarCapa(id)` mete la capa en el editor y `nombrarCapa(id, nombre)` le pone el nombre del GIF en la lista de capas.
 */
export function iniciarEditorGifs({ contenedor, marco, agregarCapa, nombrarCapa, capaEnLienzo }) {
  const rejilla = elemento('div', 'edi-gifs-rejilla');
  const pista = elemento('p', 'edi-gifs-pista');
  pista.dataset.i18n = 'gifs.tab.pista';
  contenedor.append(pista, rejilla);
  aplicarTraducciones(pista);
  let items = [];

  // El centro de la capa en el punto (x, y) de pantalla: --dx/--dy mueven desde su esquina, asi que se resta media capa.
  function posicionEn(item, x, y) {
    const caja = marco.getBoundingClientRect();
    const { ancho, alto } = formatoActual();
    const proporcion = item.ancho && item.alto ? item.alto / item.ancho : 1;
    const mitadAncho = ANCHO_BASE / 2;
    const mitadAlto = (ANCHO_BASE * ancho * proporcion) / alto / 2;
    return {
      desplazaX: limitar((x - caja.left) / caja.width - mitadAncho),
      desplazaY: limitar((y - caja.top) / caja.height - mitadAlto),
    };
  }

  function anadir(item, punto, id = idCapaGif(item.id)) {
    const yaEstaba = capaEnLienzo(id);
    prepararCapaGif(id, srcAbsoluta(item));
    const caja = marco.getBoundingClientRect();
    // Sin punto (clic) va al centro del canvas; al soltar una que ya estaba se recoloca donde se suelta.
    if (punto || !yaEstaba) Object.assign(appSettings.overlays[id], posicionEn(item, punto?.x ?? caja.left + caja.width / 2, punto?.y ?? caja.top + caja.height / 2));
    saveSettings();
    sincronizarCamposOverlay(id);
    updateOverlayUrl(id);
    nombrarCapa(id, item.nombre);
    agregarCapa(id);
  }

  function tarjeta(item) {
    const caducado = item.estado === 'caducado';
    const card = elemento('article', `edi-gif-tarjeta${caducado ? ' caducado' : ''}`);
    const vista = elemento('div', 'gif-vista');
    const medio = item.tipo === 'video' ? elemento('video', 'gif-medio') : elemento('img', 'gif-medio');
    medio.src = item.src;
    if (item.tipo === 'video') Object.assign(medio, { muted: true, loop: true, autoplay: true, playsInline: true });
    else { medio.alt = ''; medio.loading = 'lazy'; }
    medio.addEventListener('error', () => card.classList.add('caducado'));
    vista.append(medio);
    card.append(vista, elemento('span', 'edi-gif-nombre', item.nombre));
    if (!caducado) llevarAlCanvas(vista, card, item);
    return card;
  }

  // Clic: la capa aparece en el centro del canvas. Arrastrar: donde se suelte (fuera del canvas no pasa nada).
  // La pestana Media lo reutiliza con su propio `id` de capa.
  function llevarAlCanvas(vista, card, item, id) {
    vista.addEventListener('click', () => anadir(item, undefined, id));
    permitirArrastreGif(vista, {
      tarjeta: card,
      destinoEn: (x, y) => {
        const caja = marco.getBoundingClientRect();
        return x >= caja.left && x <= caja.right && y >= caja.top && y <= caja.bottom ? { fila: marco, x, y } : null;
      },
      alSoltar: (destino) => anadir(item, destino, id),
    });
  }

  function pintar() {
    const vacio = elemento('p', 'edi-vacio');
    vacio.dataset.i18n = 'gifs.tab.vacio';
    rejilla.replaceChildren(...(items.length ? items.map(tarjeta) : [vacio]));
    aplicarTraducciones(rejilla);
  }

  async function recargar() {
    try { items = (await listarGifs()).items; } catch (_) { items = []; }
    pintar();
  }

  document.addEventListener('gifs:cambiaron', recargar);
  recargar();
  return llevarAlCanvas;
}
