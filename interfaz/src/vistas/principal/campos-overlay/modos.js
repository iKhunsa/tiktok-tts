// Modo Basico / Avanzado del editor de ajustes. Solo los overlays listados aqui lo tienen; el editor unificado (canvas) no.
// El basico reutiliza los MISMOS campos: solo cambia cuales se ven, en este orden. Lo demas sigue en el avanzado.
const ASPECTO = ['color', 'bg', 'escala'];
const BASICOS_CHAT = ['escala', 'fuente', 'tamano', 'bg', 'maxmsgs', 'mostrarAvatares'];
const BASICOS_RANKING = ['escala', 'rows', 'color', 'fuente', 'bg'];
const BASICOS_ALERTA = ['imagenAlerta', 'dur', 'color', 'bg', 'escala', 'fuente'];
const BASICOS_CONTADOR = ['color', 'bg', 'escala', 'fuente'];

const compartir = (basicos, overlays) => Object.fromEntries(overlays.map((overlay) => [overlay, basicos]));

export const BASICOS_POR_OVERLAY = {
  ...compartir(BASICOS_CHAT, ['chat', 'chat-tiktok', 'chat-twitch', 'chat-youtube', 'chat-kick']),
  ...compartir(BASICOS_RANKING, ['likes', 'donadores']),
  ...compartir(BASICOS_ALERTA, ['alertas', 'nuevo-seguidor', 'compartido', 'entrada', 'bits', 'kicks', 'superchat', 'supersticker', 'suscripcion', 'renovacion']),
  'alertas-social': ['imagenAlerta', 'color', 'bg', 'escala', 'fuente'], // sin `dur`: no tiene duracion propia
  ...compartir(BASICOS_CONTADOR, ['viewers', 'contador-likes']),
  social: ['layout', ...ASPECTO],
  creditos: ['speed', ...ASPECTO],
  teclado: ['tema', ...ASPECTO],
  musica: ['color', 'bg', 'escala', 'fuente', 'mostrarBarra', 'mostrarTiempos'],
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
