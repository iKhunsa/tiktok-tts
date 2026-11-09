/**
 * Popup del limite Free del bot musical (20 solicitudes por directo). Mismo
 * patron que popup-pro.js. Un solo popup a la vez: cada !p que choca con el
 * tope vuelve a emitir music-limit-reached, no hay que apilarlos.
 */
import { t, aplicarTraducciones } from '../nucleo/i18n/i18n.js';
import { irACheckout } from '../vistas/principal/cuenta/checkout.js';
import { escaparAtributo as esc } from '../../compartido/escapar-html.js';

let abierto = null;

export function abrirPopupLimiteMusica(limit) {
  if (abierto) return;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay show';
  overlay.innerHTML = `
    <div class="modal-content discord-modal-content popup-limite-musica">
      <button class="modal-close" type="button"><img class="icon-inline" src="icons/close.svg" alt=""></button>
      <img class="discord-cat" src="img/mascota/michi-limite-musica.webp" width="1000" height="562" alt="">
      <h2>${esc(t('bot.limitTitle'))}</h2>
      <p>${esc(t('bot.limitBody', { limit }))}</p>
      <button class="cuenta-btn-primary" type="button" id="popupLimiteUpgrade" style="width:100%;">${esc(t('bot.limitUpgrade'))}</button>
    </div>`;
  document.body.appendChild(overlay);
  abierto = overlay;
  aplicarTraducciones(overlay);
  const cerrar = () => { overlay.remove(); abierto = null; };
  overlay.addEventListener('click', (e) => { if (e.target === overlay) cerrar(); });
  overlay.querySelector('.modal-close').addEventListener('click', cerrar);
  overlay.querySelector('#popupLimiteUpgrade').addEventListener('click', (e) => irACheckout(e.currentTarget));
}
