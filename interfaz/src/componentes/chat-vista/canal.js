/**
 * Puente entre la ventana principal y la ventana aparte del chat. Mismo origen
 * (127.0.0.1:3000), asi que BroadcastChannel basta: la principal difunde cada
 * mensaje ya recibido y la ventana aparte solo lo pinta (sin segunda conexion
 * WS ni segundo TTS).
 */
const NOMBRE = 'tiklive-chat';
const MAX_HISTORIAL = 150;

const canal = window.BroadcastChannel ? new window.BroadcastChannel(NOMBRE) : null;
const historial = [];
let vistaActual = null; // ajustes de la tuerca de la ventana principal

/** Solo la ventana principal: difunde el mensaje y lo guarda para quien abra la ventana despues. */
export function difundirMensaje(data, msgId) {
  historial.push({ data, msgId });
  if (historial.length > MAX_HISTORIAL) historial.shift();
  try { canal?.postMessage({ tipo: 'msg', data, msgId }); } catch { /* data no clonable: se omite */ }
}

export function difundirLimpiar() {
  historial.length = 0;
  canal?.postMessage({ tipo: 'limpiar' });
}

/** Ventana principal: publica los ajustes de la tuerca para que la ventana aparte los copie. */
export function difundirVista(cfg) {
  vistaActual = cfg;
  canal?.postMessage({ tipo: 'vista', cfg });
}

/** Ventana principal: responde con el historial cuando la ventana aparte lo pide. */
export function atenderVentanaChat() {
  if (!canal) return;
  canal.addEventListener('message', (e) => {
    if (e.data?.tipo !== 'pedir') return;
    if (vistaActual) canal.postMessage({ tipo: 'vista', cfg: vistaActual });
    canal.postMessage({ tipo: 'historial', items: historial });
  });
}

/** Ventana aparte: pide el historial y escucha los mensajes nuevos. */
export function escucharChat({ onMensaje, onLimpiar, onVista }) {
  if (!canal) return;
  canal.addEventListener('message', (e) => {
    const m = e.data;
    if (m?.tipo === 'msg') onMensaje(m.data, m.msgId);
    else if (m?.tipo === 'historial') m.items.forEach((i) => onMensaje(i.data, i.msgId));
    else if (m?.tipo === 'limpiar') onLimpiar();
    else if (m?.tipo === 'vista') onVista(m.cfg);
  });
  canal.postMessage({ tipo: 'pedir' });
}
