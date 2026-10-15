const ORIGEN_EMBED = 'https://www.youtube-nocookie.com/embed/';

/**
 * Reproductor de YouTube 16:9 para el tope del modal de Novedades. El botón de
 * pantalla completa es el del propio reproductor (allowfullscreen). Los
 * subtítulos arrancan encendidos (cc_load_policy) y un aviso debajo lo cuenta.
 */
export function crearVideoNovedades(idVideo, titulo, avisoSubtitulos) {
  const marco = document.createElement('div');
  marco.className = 'news-video';

  const reproductor = document.createElement('iframe');
  reproductor.src = `${ORIGEN_EMBED}${idVideo}?rel=0&cc_load_policy=1`;
  reproductor.title = titulo;
  reproductor.allow = 'fullscreen; encrypted-media; picture-in-picture';
  reproductor.allowFullscreen = true;
  reproductor.referrerPolicy = 'strict-origin-when-cross-origin';

  const aviso = document.createElement('p');
  aviso.className = 'news-video-hint';
  const icono = document.createElement('img');
  icono.className = 'icon-inline';
  icono.src = 'icons/closed_caption.svg';
  icono.alt = '';
  aviso.append(icono, avisoSubtitulos);

  marco.append(reproductor, aviso);
  return marco;
}
