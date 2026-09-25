import { t, tErr } from '../../nucleo/i18n/i18n.js';
import { showToast } from '../../componentes/toast.js';

// Sesion opcional de TikTok (features/canales/routes/tiktok-*.js): solo hace
// falta cuando un live redirige a /login (estado auth_required del supervisor).
// El login ocurre en una ventana de TikTok aparte; la app nunca ve la contrasena.

export async function renderTiktokSession() {
  const row = document.getElementById('tiktok-session-row');
  if (!row) return;
  let s = { available: false, loggedIn: false, authRequired: [] };
  try {
    const res = await fetch('/api/platforms/tiktok/session');
    if (res.ok) s = await res.json();
  } catch { /* noop: fila oculta */ }

  row.style.display = s.available ? 'flex' : 'none';
  if (!s.available) return;

  const pending = (!s.loggedIn && s.authRequired?.length) ? s.authRequired : [];
  const status = document.getElementById('tiktok-session-status');
  if (status) {
    status.textContent = s.loggedIn
      ? t('conn.tiktokSessionActive')
      : pending.length ? t('conn.tiktokAuthRequired', { channel: pending.map((c) => '@' + c).join(', ') }) : t('conn.tiktokSessionNone');
    status.style.color = pending.length ? 'var(--warn)' : 'var(--text-muted)';
  }
  const login = document.getElementById('btnTiktokLogin');
  const logout = document.getElementById('btnTiktokLogout');
  if (login) {
    login.style.display = s.loggedIn ? 'none' : '';
    login.classList.toggle('warn', pending.length > 0);
  }
  if (logout) logout.style.display = s.loggedIn ? '' : 'none';
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
