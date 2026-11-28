import { anguloFinal, rutaSegmento } from './geometria.js';
import { dibujarDisco, RADIO_EXTERIOR, RADIO_INTERIOR } from './dibujar-disco.js';
import { crearChispas } from './crear-chispas.js';
import { lanzarEstallido } from './lanzar-estallido.js';
import { seguirIndicador } from './seguir-indicador.js';
import { sinMovimiento } from './sin-movimiento.js';

const VUELTAS = 6;
const DURACION_MS = 5600;
const RETROCESO_GRADOS = 7;
const ARRANQUE = 'cubic-bezier(0.45, 0, 0.55, 1)';
const INERCIA = 'cubic-bezier(0.38, 0, 0.1, 1)'; // acelera y se frena en una cola larga

const rotar = (grados) => `rotate(${grados}deg)`;

/** Luz fija sobre el disco; el sector de arriba solo se enciende cuando ya hay ganador (ver ruleta.css). */
const dibujarLuz = (total) => `<svg viewBox="-600 -600 1200 1200" aria-hidden="true">
  <defs><linearGradient id="ruletaLuz" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fafafa" stop-opacity="0.1" /><stop offset="0.3" stop-color="#fafafa" stop-opacity="0" /></linearGradient></defs>
  <circle r="479" fill="none" stroke="url(#ruletaLuz)" stroke-width="142" />
  <path class="ruleta-ganador" d="${rutaSegmento(RADIO_INTERIOR, RADIO_EXTERIOR, 360 / total)}" />
</svg>`;

const INDICADOR = `<svg viewBox="0 0 70 92">
  <path d="M35 90 C27 70 5 55 5 33 A30 30 0 0 1 65 33 C65 55 43 70 35 90 Z" fill="#f0213a" stroke="#fafafa" stroke-width="5" stroke-linejoin="round" />
  <circle cx="35" cy="33" r="12" fill="#171717" stroke="#fafafa" stroke-width="4" />
</svg>`;

/**
 * Ruleta radial: solo presenta. No decide premios; `girarHasta(id)` recibe el ganador ya resuelto y detiene su casilla
 * bajo el indicador.
 * @param {{ casillas: Array<{id:string, icono:string, arte:string, arteQuieto?:string, destacado?:boolean}> }} opciones
 */
export function crearRuleta({ casillas }) {
  const elemento = document.createElement('div');
  elemento.className = 'ruleta';
  elemento.innerHTML = `
    <div class="ruleta-aro">
      <div class="ruleta-disco" data-disco>${dibujarDisco(casillas)}</div>
      <div class="ruleta-luz">${dibujarLuz(casillas.length)}</div>
    </div>
    <div class="ruleta-indicador" aria-hidden="true">${INDICADOR}</div>
    <div class="ruleta-centro" aria-hidden="true">
      <div class="ruleta-rayos"></div>
      <img class="ruleta-premio" data-premio alt="">
    </div>`;
  elemento.prepend(crearChispas());
  const disco = elemento.querySelector('[data-disco]');
  const premioCentral = elemento.querySelector('[data-premio]');
  const centro = elemento.querySelector('.ruleta-centro');
  const flecha = elemento.querySelector('.ruleta-indicador svg');
  let angulo = 0;

  async function animarHasta(destino) {
    if (sinMovimiento()) return;
    const animacion = disco.animate([
      { transform: rotar(angulo), easing: ARRANQUE },
      { transform: rotar(angulo - RETROCESO_GRADOS), offset: 0.08, easing: INERCIA },
      { transform: rotar(destino) },
    ], { duration: DURACION_MS, fill: 'forwards' });
    const dejarDeSeguir = seguirIndicador(disco, flecha, casillas.length);
    await animacion.finished.finally(dejarDeSeguir);
    disco.style.transform = rotar(destino);
    animacion.cancel();
  }

  async function girarHasta(id) {
    const candidatas = casillas.flatMap((premio, indice) => (premio.id === id ? [indice] : []));
    if (!candidatas.length) throw new Error(`La ruleta no tiene ninguna casilla para el premio "${id}"`);
    const indice = candidatas[Math.floor(Math.random() * candidatas.length)];
    elemento.classList.remove('is-ganador');
    elemento.classList.add('is-girando');
    const destino = anguloFinal(angulo, indice, casillas.length, VUELTAS);
    await animarHasta(destino);
    angulo = destino % 360;
    disco.style.transform = rotar(angulo);
    const { arte, arteQuieto = arte } = casillas[indice];
    premioCentral.src = sinMovimiento() ? arteQuieto : arte;
    elemento.classList.replace('is-girando', 'is-ganador');
    if (!sinMovimiento()) lanzarEstallido(centro);
  }

  const limpiar = () => elemento.classList.remove('is-ganador');

  return { elemento, premio: premioCentral, girarHasta, limpiar };
}
