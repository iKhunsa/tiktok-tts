import { definirHoja, crearSprite } from '../hoja-sprite.js';
import { ESTILOS_MOVIMIENTO } from './estilos.js';
import { generarParvada } from './parvada.js';

const RUTA = 'img/eventos/halloween';
const ID_ESTILO = 'evento-halloween-css';

const ANCHO_FANTASMA = 80;
const ASPECTO_FANTASMA = 280 / 352; // celda del spritesheet
const ALTO_FANTASMA = ANCHO_FANTASMA / ASPECTO_FANTASMA;
const FANTASMA = { delay: 0.5, dur: 4.2 }; // termina antes de duracionMs
const DURACION_VINETA = 5; // s, = duracionMs del evento (index.js)
const RECORRIDO_FANTASMA = 0.5; // fraccion del ancho del chat: poco trecho en mucho tiempo = lento

// Cada sentido de vuelo tiene su propio spritesheet (4x2, 8 frames).
const hojaMurcielago = (lado, archivo) => definirHoja({
  nombre: `hw-murcielago-${lado}`, src: `${RUTA}/${archivo}`, cols: 4, rows: 2, frames: 8, fps: 12,
});
const HOJAS_MURCIELAGO = { izquierda: hojaMurcielago('izq', 'bat-left.png'), derecha: hojaMurcielago('der', 'bat-right.png') };
const hojaFantasma = definirHoja({
  nombre: 'hw-fantasma-hoja', src: `${RUTA}/ghost.png`, cols: 4, rows: 2, frames: 4, fps: 3, aspecto: ASPECTO_FANTASMA,
});

function crearEstilo() {
  const estilo = document.createElement('style');
  estilo.id = ID_ESTILO;
  estilo.textContent = [HOJAS_MURCIELAGO.izquierda.css, HOJAS_MURCIELAGO.derecha.css, hojaFantasma.css, ESTILOS_MOVIMIENTO].join('\n');
  return estilo;
}

function crearMurcielago({ ancho, x0, dx, dy, dur, delay, desfaseAleteo }) {
  const vuelo = document.createElement('div');
  vuelo.className = 'hw-vuelo';
  vuelo.style.cssText = `--x0:${x0}px;--lado:${Math.sign(dx)};--dx:${dx};--dy:${dy};--dur:${dur}s;--delay:${delay}s`;
  const vaiven = document.createElement('div');
  vaiven.className = 'hw-vaiven';
  const sprite = crearSprite(dx < 0 ? HOJAS_MURCIELAGO.izquierda : HOJAS_MURCIELAGO.derecha, ancho);
  sprite.style.animationDelay = `-${desfaseAleteo}s`; // que no aleteen todos a la vez
  vaiven.appendChild(sprite);
  vuelo.appendChild(vaiven);
  return vuelo;
}

// Flota despacio por el chat (sentido aleatorio), con los pies hacia el 55% de su alto.
function crearFantasma({ chat }) {
  const haciaDerecha = Math.random() < 0.5;
  const libre = chat.width - ANCHO_FANTASMA;
  const recorrido = libre * RECORRIDO_FANTASMA;
  const inicio = libre * (haciaDerecha ? 0.15 : 0.85);
  const fantasma = document.createElement('div');
  fantasma.className = 'hw-fantasma';
  fantasma.style.cssText = `--x0:${chat.left + inicio}px;`
    + `--y:${chat.top + chat.height * 0.55 - ALTO_FANTASMA}px;`
    + `--recorrido:${haciaDerecha ? recorrido : -recorrido}px;--dur:${FANTASMA.dur}s;--delay:${FANTASMA.delay}s`;
  const camina = document.createElement('div');
  camina.className = 'hw-camina';
  const sprite = crearSprite(hojaFantasma, ANCHO_FANTASMA);
  if (!haciaDerecha) sprite.style.transform = 'scaleX(-1)'; // el dibujo mira a la derecha
  camina.appendChild(sprite);
  fantasma.appendChild(camina);
  return fantasma;
}

/** Monta la escena en `capa`; devuelve la funcion que retira los estilos inyectados. */
export function montarEscena(capa, anclas) {
  const estilo = crearEstilo();
  document.head.appendChild(estilo);
  const vineta = document.createElement('div');
  vineta.className = 'hw-vineta';
  vineta.style.setProperty('--dur', `${DURACION_VINETA}s`);
  capa.append(vineta, ...generarParvada().map(crearMurcielago), crearFantasma(anclas));
  return () => estilo.remove();
}

export const RECURSOS = [`${RUTA}/bat-left.png`, `${RUTA}/bat-right.png`, `${RUTA}/ghost.png`];
