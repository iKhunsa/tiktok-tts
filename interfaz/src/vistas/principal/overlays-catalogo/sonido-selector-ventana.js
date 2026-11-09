import { aplicarTraducciones } from '../../../nucleo/i18n/i18n.js';
import { apiSonidos } from '../gif-buscador/api.js';
import { crearAudioAlerta } from '../../../../compartido/sonido-alerta.js';
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
 * Ventana emergente con "Mis sonidos" para elegir uno: una lista con boton de oir, nombre y una sola accion, Usar.
 * Es la hermana de abrirSelectorGif. `actual` es la direccion del sonido en uso (se marca) y `alElegir(src)` recibe la
 * del elegido; se cierra al elegir, con la X, fuera de ella o con Esc. Lo que se esta oyendo se corta al cerrarla.
 */
export function abrirSelectorSonido({ actual = '', alElegir }) {
  if (abierta) return;
  const overlay = elemento('div', 'modal-overlay show');
  const ventana = elemento('div', 'modal-content gif-selector');
  ventana.setAttribute('role', 'dialog');
  ventana.setAttribute('aria-modal', 'true');
  ventana.setAttribute('aria-labelledby', 'sonidoSelectorTitulo');

  const cerrar = elemento('button', 'modal-close');
  cerrar.type = 'button';
  cerrar.setAttribute('aria-label', 'x');
  cerrar.append(Object.assign(elemento('img', 'icon-inline'), { src: 'icons/close.svg', alt: '' }));

  const cabecera = elemento('div', 'gif-selector-cabecera');
  const titulo = conTexto(elemento('h2', 'gif-selector-titulo'), 'sonidos.misSonidos');
  titulo.id = 'sonidoSelectorTitulo';
  const buscador = elemento('input', 'gif-buscar');
  buscador.type = 'search';
  buscador.dataset.i18nPlaceholder = 'sonidos.buscar';
  buscador.dataset.i18nAriaLabel = 'sonidos.buscar';
  cabecera.append(titulo, buscador);

  const lista = elemento('div', 'gif-selector-lista');
  ventana.append(cerrar, cabecera, lista);
  overlay.append(ventana);
  document.body.append(overlay);
  abierta = overlay;
  aplicarTraducciones(overlay);

  let items = [];
  let prueba = null; // el sonido que se esta oyendo (uno a la vez)
  const parar = () => { prueba?.pause(); prueba = null; };

  const pintar = () => {
    const texto = normalizar(buscador.value.trim());
    const validos = items.filter((item) => normalizar(item.nombre).includes(texto));
    lista.replaceChildren(...validos.map((item) => {
      const src = srcAbsoluta(item);
      const enUso = src === actual;
      const fila = elemento('article', `gif-selector-fila${enUso ? ' en-uso' : ''}`);
      const oir = elemento('button', 'edi-sonido-oir');
      oir.type = 'button';
      oir.dataset.i18nTitle = 'sonidos.alerta.oir';
      oir.dataset.i18nAriaLabel = 'sonidos.alerta.oir';
      oir.append(Object.assign(elemento('img', 'icon-inline'), { src: 'icons/play_arrow.svg', alt: '' }));
      oir.addEventListener('click', () => { parar(); prueba = crearAudioAlerta(src); prueba?.play().catch(() => {}); });
      const nombre = elemento('span', 'gif-selector-nombre', item.nombre);
      nombre.title = item.nombre;
      const usar = conTexto(elemento('button', 'gif-selector-usar'), enUso ? 'gifs.alerta.enUso' : 'sonidos.alerta.usar');
      usar.type = 'button';
      usar.disabled = enUso;
      usar.addEventListener('click', () => { cerrarVentana(); alElegir(src); });
      fila.append(oir, nombre, usar);
      return fila;
    }));
    if (!validos.length) lista.append(conTexto(elemento('p', 'gif-selector-vacio'), items.length ? 'sonidos.sinResultados' : 'sonidos.alerta.vacio'));
    aplicarTraducciones(lista);
  };

  function cerrarVentana() {
    parar();
    overlay.remove();
    abierta = null;
  }
  overlay.addEventListener('click', (evento) => { if (evento.target === overlay) cerrarVentana(); });
  cerrar.addEventListener('click', cerrarVentana);
  buscador.addEventListener('input', pintar);
  apiSonidos.listar().then((r) => { items = r.items; }).catch(() => { items = []; }).finally(() => { pintar(); buscador.focus(); });
}
