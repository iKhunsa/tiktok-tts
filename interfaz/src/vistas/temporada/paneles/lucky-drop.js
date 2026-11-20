import { htmlPendiente, nuevoPanel } from './pendiente.js';

// Premios del Lucky Drop (datos de ejemplo hasta tener los reales). `id` = clave de texto en temporada.luckyDrop.<id>.
const PREMIOS = ['coins', 'mysteryBall', 'proUnlock', 'ultimatePro'];

/**
 * Lucky Drop: el escenario de la maquina de garra y, a la derecha, el panel de premios, que se pliega con la pestana roja
 * de su borde para dejar el escenario libre.
 */
export function crearPanelLuckyDrop() {
  const panel = nuevoPanel('temporada-lucky');
  const icono = (id) => (id === 'coins' ? '<span class="temporada-moneda temporada-premio-moneda" aria-hidden="true"></span>' : htmlPendiente('icono', 'temporada-premio-icono'));
  const premios = PREMIOS.map((id) => `<li class="temporada-premio">${icono(id)}
    <strong data-i18n="temporada.luckyDrop.${id}.nombre"></strong>
    <span data-i18n="temporada.luckyDrop.${id}.descripcion"></span></li>`);
  panel.innerHTML = `
    <div class="temporada-maquina">${htmlPendiente('maquina')}</div>
    <aside class="temporada-premios" data-premios>
      <button type="button" class="temporada-premios-alternar" aria-expanded="true" data-alternar data-i18n-aria-label="temporada.luckyDrop.alternar"></button>
      <h2 data-i18n="temporada.luckyDrop.premios"></h2>
      <ul>${premios.join('')}</ul>
    </aside>`;
  const lateral = panel.querySelector('[data-premios]');
  const alternar = panel.querySelector('[data-alternar]');
  alternar.addEventListener('click', () => {
    const plegado = lateral.classList.toggle('is-plegado');
    alternar.setAttribute('aria-expanded', String(!plegado));
  });
  return panel;
}
