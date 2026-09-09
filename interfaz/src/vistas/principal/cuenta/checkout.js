/**
 * Inicia el checkout de Polar. Extraido de cuenta/index.js para que
 * popup-pro.js (venta de features Pro en otras vistas) tambien lo use sin
 * duplicar el botón "Hazte Pro" real.
 */
import { t } from '../../../nucleo/i18n/i18n.js';
import { showToast } from '../../../componentes/toast.js';
import { pedir, toastError } from './api.js';

export async function irACheckout(btn) {
  btn.disabled = true;
  try {
    const r = await pedir('/api/auth/checkout', { method: 'POST', body: { plan: 'pro' } });
    if (!r.ok || !r.body.url) return toastError(r.body);
    window.open(r.body.url, '_blank'); // window.js rebota la URL no-local al navegador externo
    showToast(t('cuenta.checkoutOpened'));
  } finally {
    btn.disabled = false;
  }
}
