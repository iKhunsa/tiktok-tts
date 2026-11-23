import { t, aplicarTraducciones } from '../nucleo/i18n/i18n.js';
import { almacenSesion } from '../nucleo/estado/sesion.js';
import { irACheckout } from '../vistas/principal/cuenta/checkout.js';
import { trackUi } from '../nucleo/telemetria-ui.js';

const INTERVALO_DEFAULT = 'month';
const BENEFICIOS_VISIBLES = 3;
const NOMBRE_KEY = { free: 'planesPopup.freeName', 'sin-promos': 'planesPopup.noAdsName', pro: 'planesPopup.proName' };
const PERIODO_KEY = { month: 'planesPopup.perMonth', year: 'planesPopup.perYear' };
const INTERVALO_KEY = { month: 'planesPopup.billingMonthly', year: 'planesPopup.billingYearly' };

// Precios en USD. El ahorro anual se calcula contra 12 pagos mensuales.
const PLANES = {
  'sin-promos': { nombreKey: 'planesPopup.noAdsName', precios: { month: 3, year: 25 } },
  pro: { nombreKey: 'planesPopup.proName', precios: { month: 8, year: 85 } },
};

const formatoPrecio = (usd) => `US$${usd}`;
/** Precio mensual de Pro (el que muestra el banner del chat), siempre el mismo que el popup. */
export const precioMensualPro = () => formatoPrecio(PLANES.pro.precios.month);
const ahorroPct = ({ month, year }) => Math.round(100 - (100 * year) / (12 * month));
const ahorroTexto = (plan) => t('planesPopup.savings', { pct: ahorroPct(PLANES[plan].precios) });
const ahorroMaximo = () => Math.max(...Object.values(PLANES).map((p) => ahorroPct(p.precios)));

function toggleIntervalo() {
  const opcion = (intervalo, extra = '') => `<button class="planes-popup-billing-option" type="button" data-intervalo="${intervalo}" aria-pressed="${intervalo === INTERVALO_DEFAULT}"><span data-i18n="${INTERVALO_KEY[intervalo]}"></span>${extra}</button>`;
  const pildoraAhorro = '<span class="planes-popup-billing-save"></span>';
  return `<div class="planes-popup-billing" role="group" data-i18n-aria-label="planesPopup.billingLabel">${opcion('month')}${opcion('year', pildoraAhorro)}</div>`;
}

function aplicarIntervalo(overlay, intervalo) {
  overlay.querySelectorAll('.planes-popup-billing-option').forEach((el) => {
    el.setAttribute('aria-pressed', String(el.dataset.intervalo === intervalo));
  });
  overlay.querySelectorAll('.planes-popup-action').forEach((el) => { el.dataset.intervalo = intervalo; });
  overlay.querySelectorAll('[data-price]').forEach((el) => {
    const plan = el.dataset.price;
    el.querySelector('.planes-popup-amount').textContent = formatoPrecio(PLANES[plan].precios[intervalo]);
    el.querySelector('.planes-popup-period').dataset.i18n = PERIODO_KEY[intervalo];
    el.querySelector('.planes-popup-saving').textContent = intervalo === 'year' ? ahorroTexto(plan) : '';
  });
  aplicarTraducciones(overlay);
}

const beneficio = (key) => `<li data-i18n-html="planesPopup.${key}"></li>`;

function beneficios(keys, cuantosVisibles) {
  if (!keys.length) return '';
  const visibles = keys.slice(0, cuantosVisibles).map(beneficio).join('');
  const resto = keys.slice(cuantosVisibles).map(beneficio).join('');
  const masBeneficios = resto
    ? `<details class="planes-popup-more"><summary data-i18n="planesPopup.seeAll"></summary><ul class="planes-popup-benefits">${resto}</ul></details>`
    : '';
  return `<ul class="planes-popup-benefits">${visibles}</ul>${masBeneficios}`;
}

function precio(plan) {
  const intervalo = INTERVALO_DEFAULT;
  return `<p class="planes-popup-price" data-price="${plan}">
    <span class="planes-popup-amount">${formatoPrecio(PLANES[plan].precios[intervalo])}</span><span class="planes-popup-period" data-i18n="${PERIODO_KEY[intervalo]}"></span>
    <span class="planes-popup-saving"></span>
  </p>`;
}

function accion(planActual, plan, actionKey) {
  if (planActual === plan) {
    return '<span class="planes-popup-current"><span data-i18n="planesPopup.currentPlan"></span></span>';
  }
  if (plan === 'sin-promos' && planActual === 'pro') {
    return '<span class="planes-popup-included"><span data-i18n="planesPopup.includedInPro"></span></span>';
  }
  return actionKey
    ? `<button class="cuenta-btn-primary planes-popup-action" type="button" data-plan="${plan}" data-intervalo="${INTERVALO_DEFAULT}" data-i18n="${actionKey}"></button>`
    : '';
}

function tarjeta({ planActual, plan, nombreKey, tagKey, incluyeKey, items, visibles = BENEFICIOS_VISIBLES, actionKey }) {
  const esPago = plan in PLANES;
  return `<section class="planes-popup-card is-${plan}${planActual === plan ? ' is-current' : ''}">
    <h3 data-i18n="${nombreKey}"></h3>
    <p class="planes-popup-tagline" data-i18n="${tagKey}"></p>
    ${esPago ? precio(plan) : '<p class="planes-popup-price"><span class="planes-popup-amount" data-i18n="planesPopup.freePrice"></span></p>'}
    ${incluyeKey ? `<p class="planes-popup-includes" data-i18n="${incluyeKey}"></p>` : ''}
    ${beneficios(items, visibles)}
    ${accion(planActual, plan, actionKey)}
  </section>`;
}

/** `origen`: de dónde se abre (lista cerrada de electron-shell/aptabase.js). Un handler directo le pasa el evento: se ignora. */
export function abrirPopupPlanes(origen) {
  trackUi('ui:plans-opened', typeof origen === 'string' ? origen : undefined);
  const { plan } = almacenSesion.getState();
  const planAlAbrir = plan;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay show';
  overlay.innerHTML = `
    <div class="modal-content planes-popup-content">
      <button class="modal-close" type="button"><img class="icon-inline" src="icons/close.svg" alt=""></button>
        <h2 data-i18n="planesPopup.title"></h2>
        <p class="planes-popup-current-line"></p>
        ${toggleIntervalo()}
        <div class="planes-popup-grid">
          ${tarjeta({
            planActual: plan, plan: 'free', nombreKey: 'planesPopup.freeName', tagKey: 'planesPopup.freeTag',
            items: ['freeTts', 'freeChat', 'freeModeration', 'freeOverlays', 'freeBugs'],
          })}
          ${tarjeta({
            planActual: plan, plan: 'sin-promos', nombreKey: 'planesPopup.noAdsName', tagKey: 'planesPopup.noAdsTag', incluyeKey: 'planesPopup.noAdsFree',
            items: [], actionKey: 'planesPopup.chooseNoAds',
          })}
          ${tarjeta({
            planActual: plan, plan: 'pro', nombreKey: 'planesPopup.proName', tagKey: 'planesPopup.proTag', incluyeKey: 'planesPopup.proNoAds',
            items: ['proMusic', 'proOverlays', 'proCanvas', 'proSoundpad', 'proMobile', 'proClips', 'proMcp'], visibles: 4, actionKey: 'planesPopup.choosePro',
          })}
        </div>
    </div>`;
  document.body.appendChild(overlay);
  aplicarTraducciones(overlay);
  overlay.querySelector('.planes-popup-billing-save').textContent = t('planesPopup.billingSaveUpTo', { pct: ahorroMaximo() });
  const lineaActual = overlay.querySelector('.planes-popup-current-line');
  if (NOMBRE_KEY[plan]) lineaActual.textContent = t('planesPopup.currentLine', { plan: t(NOMBRE_KEY[plan]) });
  else lineaActual.hidden = true;

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
    btn.addEventListener('click', () => irACheckout(btn, btn.dataset.plan, btn.dataset.intervalo));
  });
  overlay.querySelectorAll('.planes-popup-billing-option').forEach((btn) => {
    btn.addEventListener('click', () => aplicarIntervalo(overlay, btn.dataset.intervalo));
  });
}
