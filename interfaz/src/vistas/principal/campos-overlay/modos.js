// Modo Basico / Avanzado del editor de ajustes. Solo los overlays listados aqui lo tienen (prueba de concepto con el chat);
// el resto del editor se ve como siempre. El basico reutiliza los MISMOS campos: solo cambia cuales se ven, en este orden.
const BASICOS_CHAT = ['escala', 'fuente', 'tamano', 'bg', 'maxmsgs', 'mostrarAvatares'];

export const BASICOS_POR_OVERLAY = {
  chat: BASICOS_CHAT,
  'chat-tiktok': BASICOS_CHAT,
  'chat-twitch': BASICOS_CHAT,
  'chat-youtube': BASICOS_CHAT,
  'chat-kick': BASICOS_CHAT,
};

export const tieneModos = (overlay) => overlay in BASICOS_POR_OVERLAY;

const CLAVE_MODO = 'ovlModoEditor';

/** 'basico' (por defecto) o 'avanzado'; recordado en este equipo, sin fallar si no hay almacenamiento. */
export function leerModo() {
  try {
    return localStorage.getItem(CLAVE_MODO) === 'avanzado' ? 'avanzado' : 'basico';
  } catch {
    return 'basico'; // sin almacenamiento (ventana privada, datos bloqueados): se queda el modo por defecto
  }
}

export function guardarModo(modo) {
  try {
    localStorage.setItem(CLAVE_MODO, modo);
  } catch {
    // sin almacenamiento: el modo vale solo en esta sesion
  }
}
