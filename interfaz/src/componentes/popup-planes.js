import { t, aplicarTraducciones } from '../nucleo/i18n/i18n.js';
import { almacenSesion } from '../nucleo/estado/sesion.js';
import { irACheckout } from '../vistas/principal/cuenta/checkout.js';
import { trackUi } from '../nucleo/telemetria-ui.js';

const INTERVALO_DEFAULT = 'year';
const SUFIJO_PRECIO = { month: 'Monthly', year: '' };

function toggleIntervalo() {
  const opcion = (intervalo, key) => `<button class="planes-popup-billing-option" type="button" data-intervalo="${intervalo}" aria-pressed="${intervalo === INTERVALO_DEFAULT}" data-i18n="${key}"></button>`;
  return `<div class="planes-popup-billing" role="group" data-i18n-aria-label="planesPopup.billingLabel">${opcion('month', 'planesPopup.billingMonthly')}${opcion('year', 'planesPopup.billingYearly')}</div>`;
}

function aplicarIntervalo(overlay, intervalo) {
  overlay.querySelectorAll('[data-intervalo]').forEach((el) => {
    if (el.classList.contains('planes-popup-billing-option')) el.setAttribute('aria-pressed', String(el.dataset.intervalo === intervalo));
    else el.dataset.intervalo = intervalo;
  });
  overlay.querySelectorAll('[data-price]').forEach((el) => {
    el.dataset.i18n = `planesPopup.${el.dataset.price}Price${SUFIJO_PRECIO[intervalo]}`;
  });
  aplicarTraducciones(overlay);
}

function accion(planActual, plan, actionKey) {
  if (planActual === plan || (plan === 'sin-promos' && planActual === 'pro')) {
    return '<span class="planes-popup-current" data-i18n="planesPopup.currentPlan"></span>';
  }
  return actionKey
    ? `<button class="cuenta-btn-primary planes-popup-action" type="button" data-plan="${plan}" data-intervalo="${INTERVALO_DEFAULT}" data-i18n="${actionKey}"></button>`
    : '';
}

export function abrirPopupPlanes() {
  trackUi('ui:plans-opened');
  const { plan } = almacenSesion.getState();
  const planAlAbrir = plan;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay show';
  overlay.innerHTML = `
    <div class="modal-content planes-popup-content">
      <button class="modal-close" type="button"><img class="icon-inline" src="icons/close.svg" alt=""></button>
      <h2 data-i18n="planesPopup.title"></h2>
      ${toggleIntervalo()}
      <div class="planes-popup-grid">
        <section class="planes-popup-card${plan === 'free' ? ' is-current' : ''}">
          <h3 data-i18n="planesPopup.freeName"></h3>
          <p class="planes-popup-price" data-i18n="planesPopup.freePrice"></p>
          <ul class="planes-popup-benefits">
            <li data-i18n="planesPopup.freeTts"></li><li data-i18n="planesPopup.freeChat"></li>
            <li data-i18n="planesPopup.freeModeration"></li><li data-i18n="planesPopup.freeOverlays"></li>
            <li data-i18n="planesPopup.freeBugs"></li>
          </ul>
          ${accion(plan, 'free')}
        </section>
        <section class="planes-popup-card${plan === 'sin-promos' ? ' is-current' : ''}">
          <h3 data-i18n="planesPopup.noAdsName"></h3>
          <p class="planes-popup-price" data-price="noAds" data-i18n="planesPopup.noAdsPrice"></p>
          <ul class="planes-popup-benefits">
            <li data-i18n="planesPopup.noAdsFree"></li><li data-i18n="planesPopup.noAdsPromos"></li>
          </ul>
          ${accion(plan, 'sin-promos', 'planesPopup.chooseNoAds')}
        </section>
        <section class="planes-popup-card${plan === 'pro' ? ' is-current' : ''}">
          <h3 data-i18n="planesPopup.proName"></h3>
          <p class="planes-popup-price" data-price="pro" data-i18n="planesPopup.proPrice"></p>
          <ul class="planes-popup-benefits">
            <li data-i18n="planesPopup.proNoAds"></li><li data-i18n="planesPopup.proMusic"></li>
            <li data-i18n="planesPopup.proSoundpad"></li><li data-i18n="planesPopup.proMobile"></li>
            <li data-i18n="planesPopup.proClips"></li><li data-i18n="planesPopup.proMcp"></li>
            <li data-i18n="planesPopup.proChannels"></li>
          </ul>
          ${accion(plan, 'pro', 'planesPopup.choosePro')}
        </section>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  aplicarTraducciones(overlay);

  let desuscribir;
  const cerrar = () => {
    desuscribir();
    overlay.remove();
  };
  desuscribir = almacenSesion.subscribe(() => {
    if (almacenSesion.getState().plan !== planAlAbrir) cerrar();
  });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) cerrar(); });
  overlay.querySelector('.modal-close').addEventListener('click', cerrar);
  overlay.querySelectorAll('[data-plan]').forEach((btn) => {
    btn.addEventListener('click', (e) => irACheckout(e.currentTarget, e.currentTarget.dataset.plan, e.currentTarget.dataset.intervalo));
  });
  overlay.querySelectorAll('.planes-popup-billing-option').forEach((btn) => {
    btn.addEventListener('click', () => aplicarIntervalo(overlay, btn.dataset.intervalo));
  });
}
