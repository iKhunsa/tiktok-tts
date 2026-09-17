import { abrirPopupPlanes } from './popup-planes.js';
import { aplicarTraducciones } from '../nucleo/i18n/i18n.js';
import { almacenSesion } from '../nucleo/estado/sesion.js';

let popoverActual;

export function toggleAccountPopover(anchorEl) {
  if (popoverActual) return popoverActual.cerrar();

  const { user, plan } = almacenSesion.getState();
  const planKey = plan === 'pro' ? 'planPro' : plan === 'sin-promos' ? 'planSinPromos' : 'planFree';
  const popover = document.createElement('div');
  popover.className = 'account-popover';
  popover.innerHTML = `
    <div class="account-popover-header">
      <img class="icon-inline" src="icons/account_circle.svg" alt="">
      <div><div class="account-popover-email"></div><div class="account-popover-plan" data-i18n="accountMenu.${planKey}"></div></div>
    </div>
    <div class="account-popover-divider"></div>
    <button class="account-popover-option account-popover-upgrade" type="button"><img class="icon-inline" src="icons/flash_on.svg" alt=""><span data-i18n="accountMenu.upgradePlan"></span></button>
    <button class="account-popover-option account-popover-advanced" type="button"><img class="icon-inline" src="icons/build.svg" alt=""><span data-i18n="accountMenu.advanced"></span></button>
    <button class="account-popover-option account-popover-donate" type="button"><img class="icon-inline" src="icons/favorite-red.svg" alt=""><span data-i18n="accountMenu.donate"></span></button>
    <div class="account-popover-divider"></div>
    <button class="account-popover-option account-popover-account" type="button"><img class="icon-inline" src="icons/account_circle.svg" alt=""><span data-i18n="accountMenu.myAccount"></span></button>`;
  popover.querySelector('.account-popover-email').textContent = user?.email || '';
  if (plan === 'pro') popover.querySelector('.account-popover-upgrade').remove();
  document.body.appendChild(popover);
  aplicarTraducciones(popover);

  const rect = anchorEl.getBoundingClientRect();
  popover.style.width = `${rect.width}px`;
  popover.style.left = `${Math.max(8, rect.left)}px`;
  popover.style.top = `${Math.max(8, rect.top - popover.offsetHeight - 8)}px`;

  const cerrar = () => {
    document.removeEventListener('mousedown', cerrarAlClickAfuera);
    document.removeEventListener('keydown', cerrarConEscape);
    popover.remove();
    popoverActual = undefined;
  };
  const cerrarAlClickAfuera = (event) => {
    if (!popover.contains(event.target) && !anchorEl.contains(event.target)) cerrar();
  };
  const cerrarConEscape = (event) => { if (event.key === 'Escape') cerrar(); };
  popoverActual = { cerrar };

  document.addEventListener('mousedown', cerrarAlClickAfuera);
  document.addEventListener('keydown', cerrarConEscape);
  popover.querySelector('.account-popover-upgrade')?.addEventListener('click', () => { cerrar(); abrirPopupPlanes(); });
  popover.querySelector('.account-popover-advanced').addEventListener('click', () => { cerrar(); window.open('/advanced.html?popup=1', '_blank'); });
  popover.querySelector('.account-popover-donate').addEventListener('click', () => { cerrar(); window.openDonationsModal(); });
  popover.querySelector('.account-popover-account').addEventListener('click', () => { cerrar(); window.switchView('cuenta'); });
}
