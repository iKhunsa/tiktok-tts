/**
 * Efecto de sonido puntual de la interfaz (distinto del TTS, que tiene su cola
 * y volumen propios). El autoplay puede estar bloqueado fuera de Electron: el
 * sonido es decorativo, asi que un rechazo de play() se ignora.
 */
export function reproducirSonidoUi({ src, volumen }) {
  const audio = new Audio(src);
  audio.volume = volumen;
  audio.play().catch(() => {});
}
