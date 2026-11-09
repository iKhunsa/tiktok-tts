import { aplicarTraducciones } from '../../../nucleo/i18n/i18n.js';
import { ruedaCarrusel } from '../../../componentes/rueda-carrusel.js';
import { FONDOS_DESTACADOS, ENLACES_DESTACADOS } from './catalogo.js';

const ROTACION_MS = 6000;

const sinMovimiento = () => document.body.classList.contains('reduce-motion')
  || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function crearDiapositiva(fondo, indice) {
  const diapositiva = document.createElement('div');
  diapositiva.className = 'ovl-diapositiva';
  diapositiva.style.background = fondo;
  const enlace = ENLACES_DESTACADOS[indice];
  if (enlace) {
    diapositiva.classList.add('ovl-diapositiva-enlace');
    diapositiva.innerHTML = '<img class="icon-inline" src="icons/open_in_new.svg" alt="">';
    diapositiva.addEventListener('click', () => window.open(enlace, '_blank')); // window.js rebota la URL no-local al navegador externo
  }
  return diapositiva;
}

/** Carrusel destacado: cambia solo salvo con el cursor encima o movimiento reducido. */
export function iniciarDestacados(contenedor) {
  const diapositivas = FONDOS_DESTACADOS.map(crearDiapositiva);
  const puntos = document.createElement('div');
  puntos.className = 'ovl-puntos';
  let actual = 0;

  const irA = (indice) => {
    actual = indice;
    diapositivas.forEach((diapositiva, i) => diapositiva.classList.toggle('activa', i === indice));
    [...puntos.children].forEach((punto, i) => punto.classList.toggle('activo', i === indice));
  };

  FONDOS_DESTACADOS.forEach((_, indice) => {
    const punto = document.createElement('button');
    punto.type = 'button';
    punto.className = 'ovl-punto';
    punto.dataset.i18nAriaLabel = 'overlayCat.verDestacado';
    punto.addEventListener('click', () => irA(indice));
    puntos.append(punto);
  });

  contenedor.append(...diapositivas, puntos);
  aplicarTraducciones(contenedor);
  irA(0);
  ruedaCarrusel(contenedor, (dir) => irA((actual + dir + diapositivas.length) % diapositivas.length));

  setInterval(() => {
    const visible = contenedor.offsetParent !== null;
    const enUso = contenedor.matches(':hover') || contenedor.contains(document.activeElement);
    if (visible && !enUso && !sinMovimiento()) irA((actual + 1) % diapositivas.length);
  }, ROTACION_MS);
}
