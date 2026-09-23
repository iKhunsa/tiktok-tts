import { t, aplicarTraducciones } from '../nucleo/i18n/i18n.js';
import { almacenSesion } from '../nucleo/estado/sesion.js';
import { irACheckout } from '../vistas/principal/cuenta/checkout.js';

function accion(planActual, plan, actionKey) {
  if (planActual === plan || (plan === 'sin-promos' && planActual === 'pro')) {
    return '<span class="planes-popup-current" data-i18n="planesPopup.currentPlan"></span>';
  }
  return actionKey
    ? `<button class="cuenta-btn-primary planes-popup-action" type="button" data-plan="${plan}" data-i18n="${actionKey}"></button>`
    : '';
}

export function abrirPopupPlanes() {
  const { plan } = almacenSesion.getState();
  const planAlAbrir = plan;
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay show';
  overlay.innerHTML = `
    <div class="modal-content planes-popup-content">
      <button class="modal-close" type="button"><img class="icon-inline" src="icons/close.svg" alt=""></button>
      <h2 data-i18n="planesPopup.title"></h2>
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
          <p class="planes-popup-price" data-i18n="planesPopup.noAdsPrice"></p>
          <ul class="planes-popup-benefits">
            <li data-i18n="planesPopup.noAdsFree"></li><li data-i18n="planesPopup.noAdsPromos"></li>
          </ul>
          ${accion(plan, 'sin-promos', 'planesPopup.chooseNoAds')}
        </section>
        <section class="planes-popup-card${plan === 'pro' ? ' is-current' : ''}">
          <h3 data-i18n="planesPopup.proName"></h3>
          <p class="planes-popup-price" data-i18n="planesPopup.proPrice"></p>
          <ul class="planes-popup-benefits">
            <li data-i18n="planesPopup.proNoAds"></li><li data-i18n="planesPopup.proMusic"></li>
            <li data-i18n="planesPopup.proSoundpad"></li><li data-i18n="planesPopup.proMobile"></li>
            <li data-i18n="planesPopup.proClips"></li><li data-i18n="planesPopup.proMcp"></li>
            <li data-i18n="planesPopup.proChannels"></li><li data-i18n="planesPopup.proBackgrounds"></li>
          </ul>
          ${accion(plan, 'pro', 'planesPopup.choosePro')}
        </section>
      </div>
      <button class="planes-popup-video-card" type="button" data-plan-video>
        <img class="icon-inline" src="icons/play_arrow.svg" alt="">
        <span data-i18n="planesPopup.howItWorks"></span>
      </button>
    </div>`;
  document.body.appendChild(overlay);
  aplicarTraducciones(overlay);

  let desuscribir;
  let videoOverlay;
  const cerrarVideo = () => {
    videoOverlay?.remove();
    videoOverlay = null;
  };
  const cerrar = () => {
    cerrarVideo();
    desuscribir();
    overlay.remove();
  };
  desuscribir = almacenSesion.subscribe(() => {
    if (almacenSesion.getState().plan !== planAlAbrir) cerrar();
  });
  overlay.addEventListener('click', (e) => { if (e.target === overlay) cerrar(); });
  overlay.querySelector('.modal-close').addEventListener('click', cerrar);
  overlay.querySelectorAll('[data-plan]').forEach((btn) => {
    btn.addEventListener('click', (e) => irACheckout(e.currentTarget, e.currentTarget.dataset.plan));
  });
  overlay.querySelector('[data-plan-video]').addEventListener('click', () => {
    videoOverlay = document.createElement('div');
    videoOverlay.className = 'modal-overlay show vista-bloqueada-modal-overlay';
    videoOverlay.innerHTML = `
      <div class="modal-content vista-bloqueada-contenido" role="dialog" aria-modal="true">
        <button class="modal-close" type="button"><img class="icon-inline" src="icons/close.svg" alt=""></button>
        <div class="vista-bloqueada-video-wrap">
          <!-- Reemplazar este placeholder por el iframe cuando haya una URL aprobada. -->
          <div class="vista-bloqueada-video-placeholder"><img src="icons/play_arrow.svg" alt=""><span data-i18n="pro.demoVideoSoon"></span></div>
        </div>
      </div>`;
    document.body.appendChild(videoOverlay);
    aplicarTraducciones(videoOverlay);
    videoOverlay.addEventListener('click', (e) => { if (e.target === videoOverlay) cerrarVideo(); });
    videoOverlay.querySelector('.modal-close').addEventListener('click', cerrarVideo);
  });
}
