/**
 * Gestor del log del chat: vista unificada (un solo scroll) o dividida en
 * una columna por plataforma. Los nodos .chat-msg llevan data-plat y data-ts,
 * asi se pueden redistribuir al cambiar de modo sin perder el orden.
 */
import { t } from '../../nucleo/i18n/i18n.js';

const ORDEN = ['tiktok', 'twitch', 'youtube', 'kick', 'otros'];
const MAX_POR_COLUMNA = 300;
const PEGADO_PX = 60;

export function crearGestorLog(log) {
  let dividido = false;
  const cols = new Map(); // clave -> cuerpo scrolleable

  function cuerpoDe(clave) {
    let cuerpo = cols.get(clave);
    if (cuerpo) return cuerpo;
    const col = document.createElement('div');
    col.className = 'chat-col';
    col.dataset.plat = clave;
    col.style.order = String(ORDEN.indexOf(clave));
    const cab = document.createElement('div');
    cab.className = 'chat-col-cab';
    cab.textContent = clave === 'otros' ? t('chatVista.columnaSistema') : clave;
    cuerpo = document.createElement('div');
    cuerpo.className = 'chat-col-log';
    col.append(cab, cuerpo);
    log.appendChild(col);
    cols.set(clave, cuerpo);
    log.dataset.n = String(Math.min(cols.size, 3));
    return cuerpo;
  }

  /** Inserta el nodo donde corresponda y devuelve el contenedor que lo recibio. */
  function agregar(node, plataforma) {
    if (!dividido) { log.appendChild(node); return log; }
    const cuerpo = cuerpoDe(plataforma || 'otros');
    const alFondo = cuerpo.scrollHeight - cuerpo.scrollTop - cuerpo.clientHeight <= PEGADO_PX;
    cuerpo.appendChild(node);
    while (cuerpo.childElementCount > MAX_POR_COLUMNA) cuerpo.firstElementChild.remove();
    if (alFondo) cuerpo.scrollTop = cuerpo.scrollHeight;
    return cuerpo;
  }

  function setDividido(valor) {
    valor = !!valor;
    if (valor === dividido) return;
    const nodos = [...log.querySelectorAll('.chat-msg')]
      .sort((a, b) => Number(a.dataset.ts) - Number(b.dataset.ts));
    log.querySelectorAll('.chat-col').forEach((c) => c.remove());
    cols.clear();
    delete log.dataset.n;
    dividido = valor;
    log.classList.toggle('chat-dividido', dividido);
    nodos.forEach((n) => agregar(n, n.dataset.plat));
    if (!dividido) log.scrollTop = log.scrollHeight;
  }

  /** Tras vaciar el log por fuera (innerHTML) las columnas dejan de existir. */
  function reiniciar() { cols.clear(); delete log.dataset.n; }

  return { agregar, setDividido, reiniciar, get dividido() { return dividido; } };
}
