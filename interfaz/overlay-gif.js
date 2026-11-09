import { leerParametros } from './compartido/parametros.js';
import { registrarErroresOverlay } from './compartido/registrar-errores.js';
import { leerConfig } from './compartido/estilo/query.js';
import { ESQUEMA_GIF } from './compartido/estilo/campos-gif.js';

registrarErroresOverlay();

const params = leerParametros();
const cfg = leerConfig(ESQUEMA_GIF, params);
const raiz = document.documentElement.style;
raiz.setProperty('--escala', String(cfg.escala));
raiz.setProperty('--op', String(cfg.opacidad));
raiz.setProperty('--dx', `${cfg.desplazaX * 100}vw`);
raiz.setProperty('--dy', `${cfg.desplazaY * 100}vh`);
raiz.setProperty('--ry', `${cfg.rotaY}deg`);

// Solo http(s): el GIF viene de la URL, y esta pagina nunca debe cargar otra cosa.
const src = params.get('src');
if (src && /^https?:\/\//i.test(src)) {
  const esVideo = /\.(mp4|webm)(?:$|[?#])/i.test(src);
  const medio = document.createElement(esVideo ? 'video' : 'img');
  medio.className = 'medio';
  if (esVideo) Object.assign(medio, { autoplay: true, loop: true, muted: true, playsInline: true });
  else medio.alt = '';
  medio.src = src;
  document.body.append(medio);
}
