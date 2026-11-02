import { cargarLocaleOverlay, t, aplicarI18nOverlay } from './compartido/i18n-overlay.js';
import { leerParametros, aplicarParametrosVisuales } from './compartido/parametros.js';
import { conectarWSOverlay } from './compartido/ws-cliente.js';
import { iniciarAccesibilidadOverlay } from './compartido/accesibilidad.js';
import { registrarErroresOverlay } from './compartido/registrar-errores.js';
import { esVistaPrevia } from './compartido/vista-previa.js';
import { MUESTRA_MUSICA } from './compartido/muestras-vista-previa.js';
import { iniciarOverlayFijo } from './compartido/estilo/aplicar-overlay-fijo.js';

iniciarOverlayFijo('musica', 420, 100);
registrarErroresOverlay();

const params = leerParametros();
const vistaPrevia = esVistaPrevia(params);
aplicarParametrosVisuales(params);

const tarjeta = document.getElementById('tarjeta');
const portada = document.getElementById('portada');
const ICONO_SIN_PORTADA = 'icons/music_note.svg';
let idActual = null;

function pintarCancion(cancion) {
  const id = cancion?.videoId || cancion?.title || null;
  if (id === idActual) return;
  idActual = id;
  tarjeta.hidden = !cancion;
  if (!cancion) return;

  document.getElementById('titulo').textContent = cancion.title || '';
  document.getElementById('detalle').textContent = cancion.requestedBy
    ? t('overlayCat.musicaPedida', { user: cancion.requestedBy })
    : (cancion.channelName || cancion.channel || '');
  portada.src = cancion.thumbnail || ICONO_SIN_PORTADA;
  portada.classList.toggle('miniatura', !!cancion.thumbnail);
  portada.onerror = () => { portada.onerror = null; portada.src = ICONO_SIN_PORTADA; portada.classList.remove('miniatura'); };

  tarjeta.classList.remove('entrando');
  void tarjeta.offsetWidth;
  tarjeta.classList.add('entrando');
}

const aplicarA11y = iniciarAccesibilidadOverlay();

cargarLocaleOverlay().then(() => {
  aplicarI18nOverlay();
  fetch('/api/music/queue')
    .then((r) => r.json())
    .then((d) => pintarCancion(d.current || (vistaPrevia ? MUESTRA_MUSICA : null)))
    .catch(() => pintarCancion(vistaPrevia ? MUESTRA_MUSICA : null));
  conectarWSOverlay((d) => {
    if (d.type === 'music-now-playing') pintarCancion(d.track);
    else if (d.type === 'music-idle') pintarCancion(vistaPrevia ? MUESTRA_MUSICA : null);
    else if (d.type === 'config-updated') aplicarA11y(d.config || {});
  });
});
