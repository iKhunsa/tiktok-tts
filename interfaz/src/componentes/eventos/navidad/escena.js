import { crearNieve } from '../../temporada/nieve.js';
import { definirHoja, crearSprite } from '../hoja-sprite.js';
import { ESTILOS_NAVIDAD } from './estilos.js';
import { generarRuta } from './ruta-trineo.js';

export const DURACION_MS = 6000;
const RUTA = 'img/eventos/navidad';
const ID_ESTILO = 'evento-navidad-css';
const COPOS = 70; // mas densa que la de la ventana de temporada: aqui dura solo unos segundos
const CELDA = { ancho: 432, alto: 203 }; // celda de trineo.webp (4x2, 8 cuadros)
const ESCALA = 0.5; // respecto al tamano real del dibujo
const ANCHO_RELATIVO = 0.21; // del ancho de la ventana, como tope en ventanas estrechas
const VUELO = { retraso: 0.35, dur: 5.4 }; // s; termina antes de DURACION_MS

const hojaTrineo = definirHoja({
  nombre: 'nv-trineo-hoja', src: `${RUTA}/trineo.webp`, cols: 4, rows: 2, frames: 8, fps: 12, aspecto: CELDA.ancho / CELDA.alto,
});

function crearEstilo() {
  const estilo = document.createElement('style');
  estilo.id = ID_ESTILO;
  estilo.textContent = [hojaTrineo.css, ESTILOS_NAVIDAD].join('\n');
  return estilo;
}

/** Santa en su trineo tirado por gatos: cruza la ventana en un sentido distinto cada vez (ver ruta-trineo.js). */
function crearTrineo({ vista }) {
  const ancho = Math.round(Math.min(CELDA.ancho * ESCALA, vista.width * ANCHO_RELATIVO));
  const { desde, hasta, orientacion, mece } = generarRuta(vista, { ancho, alto: (ancho * CELDA.alto) / CELDA.ancho });
  const trineo = document.createElement('div');
  trineo.className = 'nv-trineo';
  trineo.style.cssText = `--x0:${desde.x}px;--y0:${desde.y}px;--x1:${hasta.x}px;--y1:${hasta.y}px;`
    + `--mx:${mece.x}px;--my:${mece.y}px;--vuelo:${VUELO.dur}s;--retraso:${VUELO.retraso}s`;
  const vaiven = document.createElement('div');
  vaiven.className = 'nv-vaiven';
  const sprite = crearSprite(hojaTrineo, ancho);
  sprite.style.transform = orientacion;
  vaiven.append(sprite);
  trineo.append(vaiven);
  return trineo;
}

/** Monta la escena en `capa`; devuelve la funcion que retira los estilos inyectados. */
export function montarEscena(capa, anclas) {
  const estilo = crearEstilo();
  document.head.appendChild(estilo);
  const escena = document.createElement('div');
  escena.className = 'nv-escena';
  escena.style.setProperty('--dur', `${DURACION_MS}ms`);
  crearNieve(escena, COPOS); // sus estilos vienen de temporada.css
  escena.append(crearTrineo(anclas));
  capa.append(escena);
  return () => estilo.remove();
}

export const RECURSOS = [`${RUTA}/trineo.webp`];
