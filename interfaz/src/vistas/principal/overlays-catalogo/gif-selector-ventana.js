import { aplicarTraducciones } from '../../../nucleo/i18n/i18n.js';
import { listarGifs } from '../gif-buscador/api.js';
import { srcAbsoluta } from './gif-capas.js';

const normalizar = (texto) => texto.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();

function elemento(etiqueta, clase, texto) {
  const el = document.createElement(etiqueta);
  if (clase) el.className = clase;
  if (texto !== undefined) el.textContent = texto;
  return el;
}
const conTexto = (el, clave) => { el.dataset.i18n = clave; return el; };

let abierta = null;

/**
 * Ventana emergente con "Mis GIFs" para elegir uno: una rejilla con vista previa y nombre, y una sola accion,
 * Usar. `actual` es la direccion del GIF en uso (se marca) y `alElegir(src)` recibe la del elegido; la ventana
 * se cierra al elegir, con la X, fuera de ella o con Esc (lo cierra iniciarCerrarConEscape pulsando la X).
 */
export function abrirSelectorGif({ actual = '', alElegir }) {
  if (abierta) return;
  const overlay = elemento('div', 'modal-overlay show');
  const ventana = elemento('div', 'modal-content gif-selector');
  ventana.setAttribute('role', 'dialog');
  ventana.setAttribute('aria-modal', 'true');
  ventana.setAttribute('aria-labelledby', 'gifSelectorTitulo');

  const cerrar = elemento('button', 'modal-close');
  cerrar.type = 'button';
  cerrar.setAttribute('aria-label', 'x');
  cerrar.append(Object.assign(elemento('img', 'icon-inline'), { src: 'icons/close.svg', alt: '' }));

  const cabecera = elemento('div', 'gif-selector-cabecera');
  const titulo = conTexto(elemento('h2', 'gif-selector-titulo'), 'gifs.misGifs');
  titulo.id = 'gifSelectorTitulo';
  const buscador = elemento('input', 'gif-buscar');
  buscador.type = 'search';
  buscador.dataset.i18nPlaceholder = 'gifs.buscar';
  buscador.dataset.i18nAriaLabel = 'gifs.buscar';
  cabecera.append(titulo, buscador);

  const rejilla = elemento('div', 'gif-selector-rejilla');
  ventana.append(cerrar, cabecera, rejilla);
  overlay.append(ventana);
  document.body.append(overlay);
  abierta = overlay;
  aplicarTraducciones(overlay);

  let items = [];
  const pintar = () => {
    const texto = normalizar(buscador.value.trim());
    const validos = items.filter((item) => normalizar(item.nombre).includes(texto));
    rejilla.replaceChildren(...validos.map((item) => {
      const src = srcAbsoluta(item);
      const enUso = src === actual;
      const caducado = item.estado === 'caducado';
      const tile = elemento('article', `gif-selector-tile${enUso ? ' en-uso' : ''}${caducado ? ' caducado' : ''}`);
      const vista = elemento('div', 'gif-vista');
      // Un video en bucle (Otagifs, GIPHY) se previsualiza igual que un GIF.
      vista.append(item.tipo === 'video'
        ? Object.assign(elemento('video', 'gif-medio'), { src: item.src, muted: true, loop: true, autoplay: true, playsInline: true })
        : Object.assign(elemento('img', 'gif-medio'), { src: item.src, alt: '', loading: 'lazy' }));
      const nombre = elemento('span', 'gif-selector-nombre', item.nombre);
      nombre.title = item.nombre;
      const usar = conTexto(elemento('button', 'gif-selector-usar'), caducado ? 'gifs.caducado' : enUso ? 'gifs.alerta.enUso' : 'gifs.alerta.usar');
      usar.type = 'button';
      usar.disabled = enUso || caducado;
      usar.addEventListener('click', () => { cerrarVentana(); alElegir(src); });
      tile.append(vista, nombre, usar);
      return tile;
    }));
    if (!validos.length) rejilla.append(conTexto(elemento('p', 'gif-selector-vacio'), items.length ? 'gifs.sinResultados' : 'gifs.alerta.vacio'));
    aplicarTraducciones(rejilla);
  };

  function cerrarVentana() {
    overlay.remove();
    abierta = null;
  }
  overlay.addEventListener('click', (evento) => { if (evento.target === overlay) cerrarVentana(); });
  cerrar.addEventListener('click', cerrarVentana);
  buscador.addEventListener('input', pintar);
  listarGifs().then((r) => { items = r.items; }).catch(() => { items = []; }).finally(() => { pintar(); buscador.focus(); });
}
