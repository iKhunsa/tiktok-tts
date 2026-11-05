import { conectarWSOverlay } from './ws-cliente.js';
import { MUESTRAS_MUSICA } from './muestras-vista-previa.js';

export const idDeCancion = (cancion) => cancion?.videoId || cancion?.title || null;

/** '4:24' -> 264. Lo que no se entiende cuenta como 0. */
export function segundosDe(duracion) {
  const partes = String(duracion || '').split(':').map(Number);
  if (partes.some(Number.isNaN)) return 0;
  return partes.reduce((total, parte) => total * 60 + parte, 0);
}

const ROTACION_MUESTRAS_MS = 9000;
const DURACION_TEST_MS = 10000;
const progresoDe = (cancion, position, paused) => ({ videoId: idDeCancion(cancion), position, duration: segundosDe(cancion.duration), paused });
const pedirCola = () => fetch('/api/music/queue').then((r) => r.json());

/**
 * Datos del Bot de Musica para un overlay: cancion actual, progreso y lo que sigue.
 * Lo comparten el overlay de musica y los archivos .epik de musica, asi los dos ven lo mismo.
 * - vistaPrevia: sin cancion real rota las de ejemplo.
 * - demo (popup de la tienda): una sola cancion quieta, el progreso lo manda el popup.
 * alCancion(cancion|null, progresoInicial?) · alProgreso({videoId, position, duration, paused}) · alCola(lista) · alConfig(config)
 */
export function iniciarFuenteMusica({ vistaPrevia, demo, alCancion, alProgreso, alCola, alConfig }) {
  let cancionReal = false;
  let finTest = null;

  const recibirCola = (lista) => alCola(Array.isArray(lista) ? lista : []);
  // Siguientes = cola del chat y luego la playlist de fondo; la arma el servidor (upcoming de /api/music/queue).
  const refrescarCola = () => pedirCola().then((q) => recibirCola(q.upcoming)).catch(() => {});
  const pintarReal = (cancion, progresoInicial) => {
    cancionReal = !!cancion;
    if (cancion || !vistaPrevia) alCancion(cancion, progresoInicial);
  };

  function iniciarVistaPrevia() {
    if (demo) {
      const [cancion, ...siguientes] = MUESTRAS_MUSICA;
      recibirCola(siguientes);
      alCancion(cancion, progresoDe(cancion, 0, true));
      // El popup manda el progreso de su audio con el mismo formato que el WS.
      window.addEventListener('message', ({ origin, data }) => { if (origin === location.origin && data?.type === 'music-progress') alProgreso(data); });
      return;
    }
    let indice = 0;
    const mostrar = () => {
      const cancion = MUESTRAS_MUSICA[indice % MUESTRAS_MUSICA.length];
      if (!cancionReal) recibirCola(MUESTRAS_MUSICA.filter((otra) => otra !== cancion));
      alCancion(cancion, progresoDe(cancion, 42, false));
      indice += 1;
    };
    mostrar();
    setInterval(() => { if (!cancionReal) mostrar(); }, ROTACION_MUESTRAS_MS);
  }

  // Boton Test del configurador: la cancion de ejemplo sonando unos segundos y despues lo que suene de verdad.
  function probarCancion() {
    const [cancion] = MUESTRAS_MUSICA;
    alCancion(cancion, progresoDe(cancion, 0, false));
    clearTimeout(finTest);
    if (vistaPrevia) return; // la vista previa ya muestra la cancion de ejemplo
    finTest = setTimeout(() => pedirCola().then((d) => pintarReal(d.current, d.progress)).catch(() => {}), DURACION_TEST_MS);
  }

  if (vistaPrevia) iniciarVistaPrevia();
  if (demo) return; // en la tienda nunca se mezcla la cancion real que este sonando
  pedirCola().then((d) => { recibirCola(d.upcoming); pintarReal(d.current, d.progress); }).catch(() => {});
  conectarWSOverlay((d) => {
    if (d.type === 'music-now-playing') { clearTimeout(finTest); refrescarCola(); pintarReal(d.track); }
    else if (d.type === 'music-test') probarCancion();
    else if (['music-queued', 'music-state', 'music-playlist-update'].includes(d.type)) refrescarCola();
    else if (d.type === 'music-progress') alProgreso(d);
    else if (d.type === 'music-idle') { recibirCola([]); pintarReal(null); }
    else if (d.type === 'config-updated') alConfig(d.config || {});
  });
}
