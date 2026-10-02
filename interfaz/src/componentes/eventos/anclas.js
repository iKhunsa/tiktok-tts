const ID_CHAT = 'chatLog';

const rectValido = (rect) => !!rect && rect.width > 0 && rect.height > 0;

/**
 * Zonas de la UI (en coordenadas de viewport) sobre las que un evento puede
 * dibujar. Si el chat no esta visible (otra vista activa, app bloqueada), cae
 * al viewport completo.
 */
export function obtenerAnclas() {
  const vista = { left: 0, top: 0, width: window.innerWidth, height: window.innerHeight };
  const chat = document.getElementById(ID_CHAT)?.getBoundingClientRect();
  return { vista, chat: rectValido(chat) ? chat : vista };
}
