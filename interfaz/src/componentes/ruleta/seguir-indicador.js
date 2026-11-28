import { casillaBajoIndicador } from './geometria.js';

const GOLPE = [{ transform: 'rotate(-20deg)' }, { transform: 'rotate(0deg)' }];
const REBOTE = { duration: 260, easing: 'cubic-bezier(0.34, 1.8, 0.64, 1)' };

const anguloActual = (elemento) => {
  const matriz = new window.DOMMatrix(window.getComputedStyle(elemento).transform);
  return (Math.atan2(matriz.b, matriz.a) * 180) / Math.PI;
};

/**
 * Mientras la ruleta gira, el indicador recibe un golpe cada vez que pasa una casilla: a toda velocidad se queda
 * doblado y al frenar se oye (se ve) cada paso. Devuelve la funcion que deja de seguirla.
 */
export function seguirIndicador(disco, flecha, total) {
  let anterior = casillaBajoIndicador(anguloActual(disco), total);
  let golpe = null;
  let cuadro = window.requestAnimationFrame(function revisar() {
    const casilla = casillaBajoIndicador(anguloActual(disco), total);
    if (casilla !== anterior) {
      anterior = casilla;
      golpe?.cancel();
      golpe = flecha.animate(GOLPE, REBOTE);
    }
    cuadro = window.requestAnimationFrame(revisar);
  });
  return () => window.cancelAnimationFrame(cuadro);
}
