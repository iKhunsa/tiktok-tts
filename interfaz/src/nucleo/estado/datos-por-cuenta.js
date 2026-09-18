import { almacenSesion } from './sesion.js';

const PREFIX = 'tikliveTTS_account_';
const LEGACY_KEYS = ['tikliveTTS_profileAvatar', 'tikliveTTS_v1', 'tikliveTTS_platforms_v1', 'tikliveTTS_clips_v1', 'tikliveTTS_sidebarPrefs_v1'];
const MIGRATION_KEY = 'tikliveTTS_accountDataMigrated_v1';

export function cuentaActiva() {
  const id = almacenSesion.getState().user?.id;
  return id == null || id === '' ? 'anonymous' : encodeURIComponent(String(id));
}

export function clavePorCuenta(key) {
  return `${PREFIX}${cuentaActiva()}_${key}`;
}

export function get(key) {
  try { return localStorage.getItem(clavePorCuenta(key)); } catch (_) { return null; }
}

export function set(key, value) {
  try { localStorage.setItem(clavePorCuenta(key), value); } catch (_) { /* storage unavailable */ }
}

export function remove(key) {
  try { localStorage.removeItem(clavePorCuenta(key)); } catch (_) { /* storage unavailable */ }
}

// Los datos legacy no tenian propietario: se entregan una sola vez al primer
// usuario autenticado y nunca se mezclan con el namespace anonymous.
export function migrarDatosLegacy() {
  const account = cuentaActiva();
  if (account === 'anonymous') return;
  try {
    if (localStorage.getItem(MIGRATION_KEY)) return;
    for (const key of LEGACY_KEYS) {
      const destination = clavePorCuenta(key);
      const legacy = localStorage.getItem(key);
      if (legacy != null && localStorage.getItem(destination) == null) localStorage.setItem(destination, legacy);
      localStorage.removeItem(key);
    }
    localStorage.setItem(MIGRATION_KEY, '1');
  } catch (_) { /* se reintenta en el siguiente cambio de sesion */ }
}

// Puente para plugin-store, que Vite conserva como scripts clasicos.
window.__datosPorCuenta = { get, set, remove };
