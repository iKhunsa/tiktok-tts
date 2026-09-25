import { t, tErr } from '../../nucleo/i18n/i18n.js';
import { showToast } from '../../componentes/toast.js';

// Sesion opcional de TikTok (features/canales/routes/tiktok-*.js): solo hace
// falta cuando un live redirige a /login (estado auth_required del supervisor).
// El login ocurre en una ventana de TikTok aparte; la app nunca ve la contrasena.
//
// El login NO vive en su propia fila separada de "Agregar canal" — eso se leia
// como "2 TikTok" distintos. Vive DENTRO del formulario, reemplazando el input
// cuando platform=tiktok y no hay sesion (ver toggleTiktokAddPrompt). Si un
// canal ya guardado entra en auth_required, la ventana de login se auto-abre
// (cliente-ws.js, case 'tiktok-connection-status') en vez de esperar que el
// usuario la busque.

let lastSession = { available: false, loggedIn: false, authRequired: [] };

async function fetchTiktokSession() {
  try {
    const res = await fetch('/api/platforms/tiktok/session');
    if (res.ok) return await res.json();
  } catch { /* noop */ }
  return { available: false, loggedIn: false, authRequired: [] };
}

/** Fila superior de la seccion Canales — solo importa para poder cerrar sesion. */
function renderSessionRow(s) {
  const row = document.getElementById('tiktok-session-row');
  if (!row) return;
  row.style.display = s.available && s.loggedIn ? 'flex' : 'none';
}

/**
 * Dentro de add-channel-form, con platform=tiktok: sin sesion, el input de
 * @usuario se reemplaza por el prompt de login (mismo lugar, una sola cosa a
 * la vez). Con sesion (o si el paquete no soporta sesion aun), input normal.
 */
export function toggleTiktokAddPrompt(platform) {
  const prompt = document.getElementById('tiktok-login-prompt');
  const row = document.getElementById('tiktok-add-channel-row');
  const hint = document.getElementById('channel-live-hint');
  if (!prompt || !row) return;
  const needsLogin = platform === 'tiktok' && lastSession.available && !lastSession.loggedIn;
  prompt.style.display = needsLogin ? 'flex' : 'none';
  row.style.display = needsLogin ? 'none' : 'flex';
  if (hint) hint.style.display = needsLogin ? 'none' : 'flex';
}

export async function renderTiktokSession() {
  lastSession = await fetchTiktokSession();
  renderSessionRow(lastSession);
  const platformSeg = document.getElementById('seg-tiktok');
  if (platformSeg?.classList.contains('active')) toggleTiktokAddPrompt('tiktok');
}

export async function tiktokLogin() {
  try {
    const res = await fetch('/api/platforms/tiktok/login', { method: 'POST' });
    if (!res.ok) showToast(tErr(await res.json().catch(() => ({})), 'errors.tiktokLoginFailed'), 'error');
  } catch {
    showToast(t('errors.tiktokLoginFailed'), 'error');
  }
}

export async function tiktokLogout() {
  try {
    const res = await fetch('/api/platforms/tiktok/logout', { method: 'POST' });
    if (!res.ok) { showToast(tErr(await res.json().catch(() => ({})), 'errors.tiktokLogoutFailed'), 'error'); return; }
    showToast(t('conn.tiktokLoggedOut'));
  } catch {
    showToast(t('errors.tiktokLogoutFailed'), 'error');
  }
  renderTiktokSession();
}
