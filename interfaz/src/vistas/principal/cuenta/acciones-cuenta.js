/**
 * Acciones de cuenta compartidas por la vista Cuenta y el modal "Mi cuenta"
 * (modal-cuenta/). Solo hablan con el backend y con el store de sesion; quien
 * las llama decide como pintar el resultado.
 */
import { t } from '../../../nucleo/i18n/i18n.js';
import { showToast } from '../../../componentes/toast.js';
import { aplicarSesion } from '../../../nucleo/estado/sesion.js';
import { borrarDatosDeCuenta } from '../../../nucleo/estado/datos-por-cuenta.js';
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
