import { htmlHero } from '../../../componentes/temporada/hero.js';
import { crearNieve } from '../../../componentes/temporada/nieve.js';
import { nuevoPanel } from './nuevo-panel.js';

/** Pestana de bienvenida: la ilustracion de la temporada, el texto y un boton que lleva a la siguiente seccion. */
export function crearPanelInicio(temporada, { irASiguiente }) {
  const panel = nuevoPanel('temporada-hero');
  panel.innerHTML = `<img class="temporada-escena" src="${temporada.escena}" alt="">
    <div class="temporada-contenido">${htmlHero(temporada.id)}
      <button type="button" class="temporada-cta" data-siguiente data-i18n="temporada.${temporada.id}.descubre"></button>
    </div>`;
  crearNieve(panel); // la ilustracion tapa la nieve del fondo
  panel.querySelector('[data-siguiente]').addEventListener('click', irASiguiente);
  return panel;
}
