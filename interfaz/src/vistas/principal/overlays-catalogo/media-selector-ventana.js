import { aplicarTraducciones } from '../../../nucleo/i18n/i18n.js';
import { avisarErrorMedia, listarMedia, subirMedia } from './media-api.js';

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
 * Ventana emergente con tu biblioteca Media (las imagenes que subiste) para elegir una, como la de "Mis GIFs": una
 * rejilla con vista previa y nombre, y una accion, Usar. Tambien deja subir mas imagenes sin salir de ella.
 * `actual` es la direccion de la imagen en uso (se marca) y `alElegir(src)` recibe la de la elegida; se cierra al
 * elegir, con la X o fuera de ella.
 */
export function abrirSelectorMedia({ actual = '', alElegir }) {
  if (abierta) return;
  const overlay = elemento('div', 'modal-overlay show');
  const ventana = elemento('div', 'modal-content gif-selector');
  ventana.setAttribute('role', 'dialog');
  ventana.setAttribute('aria-modal', 'true');
  ventana.setAttribute('aria-labelledby', 'mediaSelectorTitulo');

  const cerrar = elemento('button', 'modal-close');
  cerrar.type = 'button';
  cerrar.setAttribute('aria-label', 'x');
  cerrar.append(Object.assign(elemento('img', 'icon-inline'), { src: 'icons/close.svg', alt: '' }));

  const cabecera = elemento('div', 'gif-selector-cabecera');
  const titulo = conTexto(elemento('h2', 'gif-selector-titulo'), 'overlayCat.editor.tab.media');
  titulo.id = 'mediaSelectorTitulo';
  const buscador = elemento('input', 'gif-buscar');
  buscador.type = 'search';
  buscador.dataset.i18nPlaceholder = 'overlayCat.editor.transicionMediaBuscar';
  buscador.dataset.i18nAriaLabel = 'overlayCat.editor.transicionMediaBuscar';
  const subir = elemento('button', 'gif-boton-principal');
  subir.type = 'button';
  subir.innerHTML = '<img class="icon-inline" src="icons/add.svg" alt=""> <span data-i18n="overlayCat.editor.mediaSubir"></span>';
  const archivo = Object.assign(elemento('input'), { type: 'file', accept: 'image/png,image/jpeg,image/webp,image/gif', multiple: true, hidden: true });
  cabecera.append(titulo, buscador, subir, archivo);

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
      const enUso = item.src === actual;
      const tile = elemento('article', `gif-selector-tile${enUso ? ' en-uso' : ''}`);
      const vista = elemento('div', 'gif-vista');
      vista.append(Object.assign(elemento('img', 'gif-medio'), { src: item.src, alt: '', loading: 'lazy' }));
      const nombre = elemento('span', 'gif-selector-nombre', item.nombre);
      nombre.title = item.nombre;
      const usar = conTexto(elemento('button', 'gif-selector-usar'), enUso ? 'gifs.alerta.enUso' : 'gifs.alerta.usar');
      usar.type = 'button';
      usar.disabled = enUso;
      usar.addEventListener('click', () => { cerrarVentana(); alElegir(item.src); });
      tile.append(vista, nombre, usar);
      return tile;
    }));
    if (!validos.length) rejilla.append(conTexto(elemento('p', 'gif-selector-vacio'), items.length ? 'overlayCat.editor.transicionMediaSinResultados' : 'overlayCat.editor.mediaVacio'));
    aplicarTraducciones(rejilla);
  };

  const cargar = () => listarMedia().then((lista) => { items = lista; }).catch((error) => { items = []; avisarErrorMedia(error.codigo); }).finally(pintar);

  function cerrarVentana() {
    overlay.remove();
    abierta = null;
  }
  overlay.addEventListener('click', (evento) => { if (evento.target === overlay) cerrarVentana(); });
  cerrar.addEventListener('click', cerrarVentana);
  buscador.addEventListener('input', pintar);
  subir.addEventListener('click', () => archivo.click());
  archivo.addEventListener('change', async () => {
    const elegidos = [...archivo.files];
    archivo.value = '';
    if (!elegidos.length) return;
    try { await subirMedia(elegidos); } catch (error) { avisarErrorMedia(error.codigo); }
    cargar();
  });
  cargar().then(() => buscador.focus());
}
