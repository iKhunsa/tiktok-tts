/**
 * Popup de venta del plan Pro. Mismo patron que modalConfirmarCancelacion()
 * en cuenta/index.js: se arma en JS, se autodestruye al cerrar, reusa las
 * clases .modal-overlay/.modal-content ya existentes (mismo fadeIn de
 * entrada, sin CSS nuevo para la transicion).
 */
import { t, aplicarTraducciones } from '../nucleo/i18n/i18n.js';
import { irACheckout } from '../vistas/principal/cuenta/checkout.js';

const esc = (v) => String(v || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const BENEFICIO_POR_FEATURE = {
  'bot-musical': 'pro.benefit.bot',
  soundpad: 'pro.benefit.soundpad',
  'mcp-agente': 'pro.benefit.mcp',
  'overlay-decoraciones': 'pro.benefit.overlayDecoraciones',
};

export function abrirPopupPro(featureId) {
  const beneficioKey = BENEFICIO_POR_FEATURE[featureId] || 'pro.benefit.generic';
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay show';
  overlay.innerHTML = `
    <div class="modal-content" style="text-align:center;">
      <button class="modal-close" type="button"><img class="icon-inline" src="icons/close.svg" alt=""></button>
      <div class="notice-icon-badge"><img class="icon-inline" src="icons/workspace_premium.svg" alt=""></div>
      <h2 style="justify-content:center;">${esc(t('pro.popupTitle'))}</h2>
      <p class="cuenta-hint">${esc(t('pro.popupSub'))}</p>
      <p class="cuenta-hint">${esc(t(beneficioKey))}</p>
      <button class="cuenta-btn-primary" type="button" id="popupProUpgrade" style="width:100%;margin-top:16px;">${esc(t('cuenta.goPro'))}</button>
    </div>`;
  document.body.appendChild(overlay);
  aplicarTraducciones(overlay);
  const cerrar = () => overlay.remove();
  overlay.addEventListener('click', (e) => { if (e.target === overlay) cerrar(); });
  overlay.querySelector('.modal-close').addEventListener('click', cerrar);
  overlay.querySelector('#popupProUpgrade').addEventListener('click', (e) => irACheckout(e.currentTarget));
}
