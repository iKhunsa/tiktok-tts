import { aplicarTraducciones, t } from '../../../nucleo/i18n/i18n.js';
import { MISIONES, sumarRecompensas } from '../misiones.js';
import { abonarMonedas } from '../saldo.js';
import { verificarMision } from '../verificar-mision.js';
import { ponerFondo } from '../poner-fondo.js';
import { nuevoPanel } from './nuevo-panel.js';

const TOTAL = sumarRecompensas(MISIONES);
const clave = (id, campo) => `temporada.pase.misiones.${id}.${campo}`;
const arte = (id) => `img/eventos/winter/misiones/${id}.webp`;
const htmlMoneda = '<span class="temporada-moneda" aria-hidden="true"></span>';

function htmlPase() {
  const pasos = MISIONES.map(({ id, monedas }, indice) => `<button type="button" class="temporada-paso" role="option" data-indice="${indice}"
    data-i18n-aria-label="${clave(id, 'titulo')}"><img class="temporada-paso-icono" src="${arte(id)}" alt="">
    <span class="temporada-paso-premio">${htmlMoneda}${monedas}</span></button>`);
  return `<div class="temporada-pase-marco">
    <div class="temporada-cofre"><img data-arte alt=""></div>
    <div class="temporada-lateral">
      <aside class="temporada-descripcion" aria-live="polite">
        <h2 data-titulo></h2>
        <p data-descripcion></p>
        <div class="temporada-recompensa"><span data-i18n="temporada.pase.recompensa"></span><strong>${htmlMoneda}<span data-monedas></span></strong></div>
        <button type="button" class="temporada-cta temporada-cta-chico" data-desbloquear></button>
      </aside>
      <div class="temporada-total">
        <strong data-total></strong>
        <div class="temporada-total-barra" aria-hidden="true"><span></span></div>
        <span data-llevas></span>
      </div>
    </div>
    <div class="temporada-pasos" role="listbox">${pasos.join('')}</div>
    <div class="temporada-paginador">
      <button type="button" class="temporada-pagina-flecha" data-delta="-1" data-i18n-aria-label="temporada.pase.anterior"></button>
      <span class="temporada-pagina-cuenta" data-cuenta></span>
      <button type="button" class="temporada-pagina-flecha temporada-pagina-sig" data-delta="1" data-i18n-aria-label="temporada.pase.siguiente"></button>
    </div>
  </div>`;
}

/**
 * Pass: en el centro el icono de la mision elegida; a la derecha su descripcion, su recompensa, el boton de desbloquear y
 * el total del pase; debajo, la fila de misiones (la elegida se ensancha) con un paginador "n/9". Al desbloquear una se
 * verifica y sus monedas vuelan al saldo.
 */
export function crearPanelPase() {
  const panel = nuevoPanel('temporada-pase');
  panel.innerHTML = htmlPase();
  ponerFondo(panel, 'img/eventos/winter/pass.webp');
  const $ = (selector) => panel.querySelector(selector);
  const botones = [...panel.querySelectorAll('.temporada-paso')];
  const imagen = $('[data-arte]');
  const desbloquear = $('[data-desbloquear]');
  const verificando = new Set();
  const completadas = new Set();
  let activo = 0;

  function pintarMision() {
    const { id, monedas } = MISIONES[activo];
    imagen.src = arte(id);
    $('.temporada-cofre').classList.toggle('is-completada', completadas.has(id));
    $('[data-titulo]').dataset.i18n = clave(id, 'titulo');
    $('[data-descripcion]').dataset.i18n = clave(id, 'descripcion');
    $('[data-monedas]').textContent = `+${monedas}`;
    desbloquear.disabled = completadas.has(id) || verificando.has(id);
    desbloquear.classList.toggle('is-completada', completadas.has(id));
    const estado = completadas.has(id) ? 'completada' : verificando.has(id) ? 'verificando' : 'desbloquear';
    desbloquear.dataset.i18n = `temporada.pase.${estado}`;
    aplicarTraducciones($('.temporada-descripcion'));
  }

  function pintar() {
    botones.forEach((boton, indice) => {
      boton.classList.toggle('is-activo', indice === activo);
      boton.classList.toggle('is-completada', completadas.has(MISIONES[indice].id));
      boton.setAttribute('aria-selected', String(indice === activo));
    });
    const ganadas = sumarRecompensas(MISIONES.filter(({ id }) => completadas.has(id)));
    $('[data-total]').textContent = t('temporada.pase.total', { total: TOTAL });
    $('[data-llevas]').textContent = t('temporada.pase.llevas', { ganadas, total: TOTAL });
    $('.temporada-total-barra span').style.transform = `scaleX(${ganadas / TOTAL})`;
    $('[data-cuenta]').textContent = `${activo + 1}/${MISIONES.length}`;
    pintarMision();
  }

  function elegir(indice) {
    const destino = Math.min(MISIONES.length - 1, Math.max(0, indice));
    if (destino === activo) return;
    activo = destino;
    pintar();
    imagen.animate([{ opacity: 0, scale: 0.9 }, { opacity: 1, scale: 1 }], { duration: 240, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' });
  }

  async function completar(indice) {
    const { id, monedas } = MISIONES[indice];
    verificando.add(id);
    pintar();
    const cumplida = await verificarMision(id).finally(() => verificando.delete(id));
    if (cumplida) completadas.add(id);
    pintar();
    // Las monedas salen del icono grande si sigue a la vista; si ya se miro otra mision, de su casilla.
    if (cumplida) abonarMonedas(monedas, indice === activo ? imagen : botones[indice]);
  }

  panel.addEventListener('click', (evento) => {
    const paso = evento.target.closest('.temporada-paso');
    const flecha = evento.target.closest('[data-delta]');
    if (paso) elegir(Number(paso.dataset.indice));
    else if (flecha) elegir(activo + Number(flecha.dataset.delta));
    else if (evento.target.closest('[data-desbloquear]')) completar(activo);
  });
  pintar();
  return panel;
}
