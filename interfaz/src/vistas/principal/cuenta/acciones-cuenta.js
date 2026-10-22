/**
 * Acciones de cuenta compartidas por la vista Cuenta y el modal "Mi cuenta"
 * (modal-cuenta/). Solo hablan con el backend y con el store de sesion; quien
 * las llama decide como pintar el resultado.
 */
import { t } from '../../../nucleo/i18n/i18n.js';
import { showToast } from '../../../componentes/toast.js';
import { aplicarSesion } from '../../../nucleo/estado/sesion.js';
import { borrarDatosDeCuenta } from '../../../nucleo/estado/datos-por-cuenta.js';
import { escaparAtributo as esc } from '../../../../compartido/escapar-html.js';
import { pedir, toastError } from './api.js';
import { autenticarConGoogleUI } from './plataforma-auth-cliente.js';

// La sesion pasa a anonymous y la ventana se recarga: el aviso sobrevive al reload.
export const AVISO_CUENTA_ELIMINADA = 'tikliveTTS_cuentaEliminada';

export async function listaIdentidades() {
  const r = await pedir('/api/account/identities');
  if (!r.ok) return [];
  return Array.isArray(r.body) ? r.body : (r.body.identities || []);
}

/** true si Google quedo vinculado; false si se cancelo o fallo (ya avisado). */
export async function vincularGoogle() {
  const datos = await autenticarConGoogleUI();
  if (!datos) return false;
  const r = await pedir('/api/account/link/google', { method: 'POST', body: datos });
  if (!r.ok) {
    toastError(r.body, 'errors.generic');
    return false;
  }
  showToast(t('cuenta.googleLinkedDone'));
  return true;
}

export async function cerrarSesion() {
  await pedir('/api/auth/logout', { method: 'POST' });
  aplicarSesion({ activo: true, signedIn: false });
}

// El backend borra todo y la app cierra sesion y limpia sus datos locales; aca
// solo se limpia lo del renderer (antes de pasar a anonymous) y se avisa.
function finalizarBorradoCuenta() {
  try { sessionStorage.setItem(AVISO_CUENTA_ELIMINADA, '1'); } catch (_) { /* sin storage: no hay aviso */ }
  borrarDatosDeCuenta();
  aplicarSesion({ activo: true, signedIn: false });
}

// Mismo endpoint para los dos metodos: el backend acepta {password} o
// {code, codeVerifier, redirectUri} para confirmar el borrado.
async function borrarCuenta(body) {
  const r = await pedir('/api/account', { method: 'DELETE', body });
  if (!r.ok) {
    toastError(r.body);
    return false;
  }
  finalizarBorradoCuenta();
  return true;
}

export const eliminarCuenta = (password) => borrarCuenta({ password });
export const eliminarCuentaGoogle = borrarCuenta;

// Modal propio (mismo patron visual que modWipeConfirmModal en index.html) en
// vez de confirm() nativo — un dialogo de navegador desentona con el resto
// de la app. Compartido por la vista Cuenta y el modal "Mi cuenta".
export function modalConfirmarCancelacion() {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay show';
    overlay.innerHTML = `
      <div class="modal-content cuenta-cancel-modal">
        <button class="modal-close" type="button" id="modal-close"><img class="icon-inline" src="icons/close.svg" alt=""></button>
        <div class="cuenta-cancel-copy">
          <div class="notice-icon-badge"><span class="icon-inline notice-icon-warn" aria-hidden="true"></span></div>
          <h2>${esc(t('cuenta.confirmCancelTitle')).replace(' ', '<br>')}</h2>
          <p class="cuenta-cancel-description">${esc(t('cuenta.confirmCancel'))}</p>
          <button class="btn btn-connect cuenta-cancel-confirm" type="button" id="cuentaCancelYes">${esc(t('cuenta.confirmCancelYes'))}</button>
          <button class="btn btn-disconnect cuenta-cancel-back" type="button" id="cuentaCancelNo">${esc(t('cuenta.confirmCancelNo'))}</button>
          <p class="cuenta-cancel-notice"><img class="icon-inline" src="icons/lock.svg" alt="">${esc(t('cuenta.confirmCancelNotice'))}</p>
        </div>
        <div class="cuenta-cancel-image"><img src="img/mascota/michi-triste.png" alt=""></div>
      </div>`;
    document.body.appendChild(overlay);
    const cerrar = (resultado) => { overlay.remove(); resolve(resultado); };
    overlay.addEventListener('click', (e) => { if (e.target === overlay) cerrar(false); });
    overlay.querySelector('.modal-close').addEventListener('click', () => cerrar(false));
    overlay.querySelector('#cuentaCancelNo').addEventListener('click', () => cerrar(false));
    overlay.querySelector('#cuentaCancelYes').addEventListener('click', () => cerrar(true));
  });
}

// Las tres hablan con el backend + aplicarSesion; quien llama decide como
// pintar el resultado (toast + re-pintar su propia vista).
export async function cancelarSuscripcion() {
  const confirmado = await modalConfirmarCancelacion();
  if (!confirmado) return null;
  const r = await pedir('/api/auth/subscription/cancel', { method: 'POST' });
  if (!r.ok) { toastError(r.body); return null; }
  aplicarSesion(r.body);
  showToast(t('cuenta.canceled'));
  return r.body;
}

export async function reanudarSuscripcion() {
  const r = await pedir('/api/auth/subscription/resume', { method: 'POST' });
  if (!r.ok) { toastError(r.body); return null; }
  aplicarSesion(r.body);
  showToast(t('cuenta.resumed'));
  return r.body;
}

export async function pasarAMensual() {
  const r = await pedir('/api/auth/subscription/change-interval', { method: 'POST', body: { intervalo: 'month' } });
  if (!r.ok) { toastError(r.body); return null; }
  aplicarSesion(r.body);
  showToast(t('cuenta.switchRequested'));
  return r.body;
}
