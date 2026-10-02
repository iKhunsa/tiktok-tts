const ORIGEN_EMBED = 'https://www.youtube-nocookie.com/embed/';

/**
 * Reproductor de YouTube 16:9 para el tope del modal de Novedades. El botón de
 * pantalla completa es el del propio reproductor (allowfullscreen).
 */
export function crearVideoNovedades(idVideo, titulo) {
  const marco = document.createElement('div');
  marco.className = 'news-video';

  const reproductor = document.createElement('iframe');
  reproductor.src = `${ORIGEN_EMBED}${idVideo}?rel=0`;
  reproductor.title = titulo;
  reproductor.allow = 'fullscreen; encrypted-media; picture-in-picture';
  reproductor.allowFullscreen = true;
  reproductor.referrerPolicy = 'strict-origin-when-cross-origin';
  marco.append(reproductor);
  return marco;
}
