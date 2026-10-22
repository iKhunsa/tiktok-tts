/**
 * Seccion "Facturacion" del modal "Mi cuenta": plan + cancelacion con datos
 * reales de la sesion (misma fuente que planCard() en cuenta/index.js).
 * Metodo de pago/historial de facturas: sin fuente real todavia (eso vive en
 * Polar, no en nuestra DB) -- se avisa en vez de inventar datos.
 */
import { t, aplicarTraducciones } from '../../../../nucleo/i18n/i18n.js';
import { escaparAtributo as esc } from '../../../../../compartido/escapar-html.js';
import { abrirPopupPlanes } from '../../../../componentes/popup-planes.js';
import { cancelarSuscripcion, reanudarSuscripcion, pasarAMensual } from '../acciones-cuenta.js';

function estadoPlan(s) {
  const esPro = s.plan === 'pro';
  const esSinPromos = s.plan === 'sin-promos';
  const sub = s.subscription || {};
  const hasta = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : '';
  let estado;
  if (esPro && sub.cancelAtPeriodEnd) estado = t('cuenta.planProCancels', { fecha: hasta });
  else if (esPro) estado = t('cuenta.planProUntil', { fecha: hasta });
  else if (esSinPromos && sub.cancelAtPeriodEnd) estado = t('cuenta.planSinPromosCancels', { fecha: hasta });
  else if (esSinPromos) estado = t('cuenta.planSinPromosDesc');
  else estado = t('cuenta.planFreeDesc');
  return { esPro, esSinPromos, sub, estado };
}

export function pintarFacturacion(cont, s) {
  const { esPro, esSinPromos, sub, estado } = estadoPlan(s);
  const conPlanPago = esPro || esSinPromos;
  const nombrePlan = esPro ? 'Pro' : esSinPromos ? t('cuenta.planSinPromosName') : t('cuenta.planFree');

  cont.insertAdjacentHTML('beforeend', `
    <div class="mc-bloque mc-plan">
      <img class="mc-plan-icono" src="icons/${conPlanPago ? 'crown-gold' : 'piedra'}.svg" alt="">
      <div class="mc-plan-texto">
        <div>${esc(nombrePlan)}</div>
        ${sub.interval ? `<div data-i18n="${sub.interval === 'month' ? 'cuentaModal.monthly' : 'cuentaModal.yearly'}"></div>` : ''}
        <p class="mc-bloque-desc">${esc(estado)}</p>
      </div>
      <button class="mc-accion" type="button" id="mcCambiarPlan" data-i18n="cuentaModal.changePlan"></button>
    </div>

    <div class="mc-bloque">
      <div>
        <h3 class="mc-bloque-titulo" data-i18n="cuentaModal.payment"></h3>
        <p class="mc-bloque-desc" data-i18n="cuentaModal.paymentUnavailable"></p>
      </div>
    </div>

    ${conPlanPago ? `
    <h3 class="mc-bloque-titulo mc-cancelacion-titulo" data-i18n="cuentaModal.cancellation"></h3>
    <div class="mc-fila">
      <span class="mc-fila-label" data-i18n="cuentaModal.cancelPlan"></span>
      ${sub.cancelAtPeriodEnd
    ? `<button class="mc-accion" type="button" id="mcReanudar" data-i18n="cuenta.resume"></button>`
    : `<button class="mc-eliminar mc-cancelar" type="button" id="mcCancelar" data-i18n="cuentaModal.cancel"></button>`}
    </div>
    ${sub.interval === 'year' && !sub.cancelAtPeriodEnd ? `
    <div class="mc-fila">
      <span class="mc-fila-label" data-i18n="cuenta.switchToMonthly"></span>
      <button class="mc-accion" type="button" id="mcMensual" data-i18n="cuenta.switchToMonthly"></button>
    </div>` : ''}
    ` : ''}`);
  aplicarTraducciones(cont);

  cont.querySelector('#mcCambiarPlan').addEventListener('click', () => abrirPopupPlanes());
  cont.querySelector('#mcCancelar')?.addEventListener('click', async (e) => {
    e.currentTarget.disabled = true;
    await cancelarSuscripcion();
  });
  cont.querySelector('#mcReanudar')?.addEventListener('click', async (e) => {
    e.currentTarget.disabled = true;
    await reanudarSuscripcion();
  });
  cont.querySelector('#mcMensual')?.addEventListener('click', async (e) => {
    e.currentTarget.disabled = true;
    await pasarAMensual();
  });
}
