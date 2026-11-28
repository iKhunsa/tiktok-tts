import { aplicarTraducciones } from '../../nucleo/i18n/i18n.js';
import { sinMovimiento } from './sin-movimiento.js';

const SELLO = [{ opacity: 0, transform: 'scale(0.85) rotate(-6deg)' }, { opacity: 1, transform: 'none' }];
// El desenfoque funde el texto viejo con el nuevo para que no se vea un salto.
const TEXTO = [{ opacity: 0, transform: 'translateY(8px)', filter: 'blur(3px)' }, { opacity: 1, transform: 'none', filter: 'blur(0)' }];
const FUNDIDO = [{ opacity: 0 }, { opacity: 1 }];
const CURVA = { duration: 280, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' };

function animarRelevo(sello, texto) {
  const quieto = sinMovimiento();
  sello.animate(quieto ? FUNDIDO : SELLO, CURVA);
  texto.animate(quieto ? FUNDIDO : TEXTO, { ...CURVA, delay: 40, fill: 'backwards' });
}

/**
 * Pie de la ruleta: la tarjeta con el detalle del premio y, aparte, el boton de girar con su precio y el atajo de
 * teclado. Los textos llegan como claves de i18n.
 * @param {{ precio?: number }} [opciones] monedas por giro
 */
export function crearTarjetaPremio({ precio } = {}) {
  const elemento = document.createElement('div');
  elemento.className = 'ruleta-pie';
  elemento.innerHTML = `
    <div class="ruleta-tarjeta">
      <span class="ruleta-tarjeta-sello" aria-hidden="true"><img data-sello alt=""></span>
      <div class="ruleta-tarjeta-texto" aria-live="polite"><strong data-nombre></strong><p data-descripcion></p></div>
    </div>
    <div class="ruleta-acciones">
      <button type="button" class="ruleta-girar" data-girar aria-keyshortcuts="Space"></button>
      <span class="ruleta-precio" data-precio><span data-i18n="temporada.luckyDrop.coste"></span><span class="temporada-moneda" aria-hidden="true"></span>${precio}</span>
      <span class="ruleta-atajo"><span data-i18n="temporada.luckyDrop.oPulsa"></span><kbd data-i18n="temporada.luckyDrop.espacio"></kbd></span>
    </div>`;
  const sello = elemento.querySelector('[data-sello]');
  const nombre = elemento.querySelector('[data-nombre]');
  const descripcion = elemento.querySelector('[data-descripcion]');
  const boton = elemento.querySelector('[data-girar]');
  const tarjeta = elemento.querySelector('.ruleta-tarjeta');
  const coste = elemento.querySelector('[data-precio]');
  const texto = elemento.querySelector('.ruleta-tarjeta-texto');
  let accion = 'girar';

  /** Sin `icono` la tarjeta queda solo con el texto y el boton. */
  function mostrar({ clave, icono }) {
    tarjeta.classList.toggle('sin-sello', !icono);
    if (icono) {
      sello.src = icono;
      sello.classList.toggle('is-simbolo', icono.startsWith('icons/'));
    }
    nombre.dataset.i18n = `${clave}.nombre`;
    descripcion.dataset.i18n = `${clave}.descripcion`;
    aplicarTraducciones(elemento);
    animarRelevo(sello.parentElement, texto);
  }
  function ocupar(ocupada) {
    boton.disabled = ocupada;
    boton.dataset.i18n = `temporada.luckyDrop.${ocupada && accion === 'girar' ? 'girando' : accion}`;
    coste.hidden = !precio || accion !== 'girar';
    aplicarTraducciones(elemento);
  }
  /** Cambia lo que hace el boton: 'girar' la ruleta o 'abrir' lo que acaba de salir. */
  function pedir(nueva) {
    accion = nueva;
    ocupar(false);
  }
  return { elemento, boton, mostrar, ocupar, pedir, accion: () => accion };
}
