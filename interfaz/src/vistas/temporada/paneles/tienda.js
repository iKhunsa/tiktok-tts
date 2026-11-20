import { htmlPendiente, nuevoPanel } from './pendiente.js';

const CARTAS = 4; // overlays exclusivos de la temporada (datos de ejemplo hasta tener el catalogo real)

/** Shop: los overlays exclusivos del evento, cuatro cartas verticales. */
export function crearPanelTienda() {
  const panel = nuevoPanel('temporada-tienda');
  const cartas = Array.from({ length: CARTAS }, (_, indice) => `<div class="temporada-carta" style="--i:${indice}">${htmlPendiente('overlay')}</div>`);
  panel.innerHTML = `<div class="temporada-cartas">${cartas.join('')}</div>`;
  return panel;
}
