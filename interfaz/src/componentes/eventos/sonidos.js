/**
 * Reproduccion de los sonidos de un evento (HTMLAudioElement ya precargados).
 * El autoplay puede estar bloqueado fuera de Electron: el sonido es decorativo,
 * asi que un rechazo de play() se ignora.
 */
export function reproducirSonidos(audios) {
  audios.forEach((audio) => audio.play().catch(() => {}));
}

export function detenerSonidos(audios) {
  audios.forEach((audio) => audio.pause());
}
