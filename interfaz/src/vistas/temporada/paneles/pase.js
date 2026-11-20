import { aplicarTraducciones, t } from '../../../nucleo/i18n/i18n.js';
import { htmlPendiente, nuevoPanel } from './pendiente.js';

const PASOS = 9; // recompensas del pase (datos de ejemplo hasta tener el pase real)

/**
 * Pass: el cofre de la recompensa elegida, su descripcion con el boton de desbloquear y, debajo, la fila de recompensas
 * (la elegida se ensancha) con un paginador "n/9". Las flechas, el clic en una recompensa y el teclado cambian la elegida.
 */
export function crearPanelPase() {
  const panel = nuevoPanel('temporada-pase');
  const pasos = Array.from({ length: PASOS }, (_, indice) => `<button type="button" class="temporada-paso" role="option" data-indice="${indice}"
    data-i18n-aria-label="temporada.pase.recompensa" data-n="${indice + 1}">${htmlPendiente('icono')}</button>`);
  panel.innerHTML = `
    <div class="temporada-cofre">${htmlPendiente('cofre')}</div>
    <aside class="temporada-descripcion">
      <h2 data-i18n="temporada.pase.descripcion"></h2>
      <p data-descripcion></p>
      <button type="button" class="temporada-cta temporada-cta-chico" data-i18n="temporada.pase.desbloquear"></button>
    </aside>
    <div class="temporada-pasos" role="listbox">${pasos.join('')}</div>
    <div class="temporada-paginador">
      <button type="button" class="temporada-pagina-flecha" data-delta="-1" data-i18n-aria-label="temporada.pase.anterior"></button>
      <span class="temporada-pagina-cuenta" data-cuenta></span>
      <button type="button" class="temporada-pagina-flecha temporada-pagina-sig" data-delta="1" data-i18n-aria-label="temporada.pase.siguiente"></button>
    </div>`;

  const botones = [...panel.querySelectorAll('.temporada-paso')];
  const descripcion = panel.querySelector('[data-descripcion]');
  let activo = 0;

  function pintar() {
    botones.forEach((boton, indice) => {
      boton.classList.toggle('is-activo', indice === activo);
      boton.setAttribute('aria-selected', String(indice === activo));
      boton.setAttribute('aria-label', t('temporada.pase.recompensa', { n: indice + 1 }));
    });
    descripcion.dataset.i18n = activo === 0 ? 'temporada.pase.paso1' : 'temporada.pase.proximo';
    aplicarTraducciones(descripcion);
    panel.querySelector('[data-cuenta]').textContent = `${activo + 1}/${PASOS}`;
  }
  const elegir = (indice) => { activo = Math.min(PASOS - 1, Math.max(0, indice)); pintar(); };

  panel.addEventListener('click', (evento) => {
    const paso = evento.target.closest('.temporada-paso');
    const flecha = evento.target.closest('[data-delta]');
    if (paso) elegir(Number(paso.dataset.indice));
    else if (flecha) elegir(activo + Number(flecha.dataset.delta));
  });
  pintar();
  return panel;
}
