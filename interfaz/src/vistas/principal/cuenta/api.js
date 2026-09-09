/**
 * Cliente HTTP + helper de error compartidos por la vista Cuenta y por
 * checkout.js — extraidos de index.js porque irACheckout (checkout.js) los
 * necesita y viven en carpetas separadas (evita el ciclo index.js<->checkout.js).
 */
import { tErr } from '../../../nucleo/i18n/i18n.js';
import { showToast } from '../../../componentes/toast.js';

export async function pedir(path, opts) {
  const r = await fetch(path, {
    method: opts?.method || 'GET',
    headers: opts?.body ? { 'Content-Type': 'application/json' } : undefined,
    body: opts?.body ? JSON.stringify(opts.body) : undefined,
  });
  let body = null;
  try { body = await r.json(); } catch (_) { /* sin cuerpo */ }
  return { ok: r.ok, status: r.status, body: body || {} };
}

export function toastError(body, fallbackKey) {
  showToast(tErr(body, fallbackKey || 'errors.generic'));
}
