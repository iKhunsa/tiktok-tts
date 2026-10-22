/**
 * Seccion "Facturacion" del modal "Mi cuenta": plan, metodo de pago, historial
 * de facturas y cancelacion.
 * Solo interfaz por ahora: FACTURACION_EJEMPLO reemplaza los datos reales y los
 * botones todavia no hacen nada (los conecta el back).
 */
import { t, aplicarTraducciones, idiomaActual } from '../../../../nucleo/i18n/i18n.js';
import { escaparAtributo as esc } from '../../../../../compartido/escapar-html.js';

const FACTURACION_EJEMPLO = {
  plan: 'Pro',
  intervalo: 'month', // 'month' | 'year'
  renovacion: '2026-10-26',
  tarjeta: { marca: 'visa', nombre: 'Visa', ultimos4: '3307', vence: '03/2028', predeterminada: true },
  // Mas reciente primero.
  facturas: ['2026-09-26', '2026-08-26', '2026-07-26', '2026-06-26', '2026-05-26', '2026-05-09', '2026-04-26', '2026-03-26']
    .map((fecha) => ({ fecha, total: 20, moneda: 'USD', estado: 'pagada', pdf: '#' })),
};

const fecha = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString(idiomaActual(), { day: 'numeric', month: 'short', year: 'numeric' });
const importe = (n, moneda) => new Intl.NumberFormat(idiomaActual(), { style: 'currency', currency: moneda, maximumFractionDigits: 0 }).format(n);

export function pintarFacturacion(cont) {
  const d = FACTURACION_EJEMPLO;
  const tj = d.tarjeta;
  cont.insertAdjacentHTML('beforeend', `
    <div class="mc-bloque mc-plan">
      <img class="mc-plan-icono" src="icons/crown-gold.svg" alt="">
      <div class="mc-plan-texto">
        <div>${esc(t('cuentaModal.planName', { plan: d.plan }))}</div>
        <div data-i18n="${d.intervalo === 'year' ? 'cuentaModal.yearly' : 'cuentaModal.monthly'}"></div>
        <p class="mc-bloque-desc">${esc(t('cuentaModal.renewsOn', { fecha: fecha(d.renovacion) }))}</p>
      </div>
      <button class="mc-accion" type="button" data-i18n="cuentaModal.changePlan"></button>
    </div>

    <div class="mc-bloque">
      <div>
        <h3 class="mc-bloque-titulo" data-i18n="cuentaModal.payment"></h3>
        <p class="mc-bloque-desc" data-i18n="cuentaModal.paymentHint"></p>
      </div>
      <button class="mc-accion" type="button" data-i18n="cuentaModal.addPayment"></button>
    </div>
    <div class="mc-bloque mc-tarjeta-pago">
      <div>
        <div class="mc-tarjeta-pago-linea">
          <img src="icons/${esc(tj.marca)}.svg" alt="">
          <span>${esc(tj.nombre)} •••• ${esc(tj.ultimos4)}</span>
          ${tj.predeterminada ? '<span class="mc-predeterminado" data-i18n="cuentaModal.default"></span>' : ''}
        </div>
        <div class="mc-tarjeta-pago-vence">${esc(t('cuentaModal.expires', { fecha: tj.vence }))}</div>
      </div>
      <button class="mc-accion" type="button" data-i18n="cuentaModal.update"></button>
    </div>

    <h3 class="mc-bloque-titulo mc-facturas-titulo" data-i18n="cuentaModal.invoices"></h3>
    <table class="mc-facturas">
      <thead><tr>
        <th data-i18n="cuentaModal.colDate"></th><th data-i18n="cuentaModal.colTotal"></th>
        <th data-i18n="cuentaModal.colStatus"></th><th data-i18n="cuentaModal.colActions"></th>
      </tr></thead>
      <tbody>${d.facturas.map((f) => `
        <tr>
          <td>${esc(fecha(f.fecha))}</td>
          <td>${esc(importe(f.total, f.moneda))}</td>
          <td data-i18n="cuentaModal.invoice_${esc(f.estado)}"></td>
          <td><a class="mc-link" href="${esc(f.pdf)}" data-i18n="cuentaModal.downloadPdf"></a></td>
        </tr>`).join('')}
      </tbody>
    </table>

    <h3 class="mc-bloque-titulo mc-cancelacion-titulo" data-i18n="cuentaModal.cancellation"></h3>
    <div class="mc-fila">
      <span class="mc-fila-label" data-i18n="cuentaModal.cancelPlan"></span>
      <button class="mc-eliminar mc-cancelar" type="button" data-i18n="cuentaModal.cancel"></button>
    </div>`);
  aplicarTraducciones(cont);
  // Sin back todavia: el enlace de ejemplo no navega.
  cont.querySelector('.mc-facturas').addEventListener('click', (e) => {
    if (e.target.closest('.mc-link')) e.preventDefault();
  });
}
