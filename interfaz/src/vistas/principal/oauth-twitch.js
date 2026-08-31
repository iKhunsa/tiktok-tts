import { t, tErr } from '../../nucleo/i18n/i18n.js';
import { showToast } from '../../componentes/toast.js';

export async function patchPlatformConfig(patch) {
  try {
    await fetch('/api/platform-config', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
    });
  } catch (_) { showToast(t('toast.testError')); }
}

export async function saveTwitchClientId(value) {
  await patchPlatformConfig({ twitchClientId: (value || '').trim() });
}

export async function loadPlatformConfigUI() {
  try {
    const res = await fetch('/api/platform-config');
    const cfg = await res.json();
    const twitchInp = document.getElementById('twitchOAuthClientId');
    if (twitchInp) twitchInp.value = cfg.twitchClientId || '';
  } catch (_) { /* config no disponible aun */ }
}

/**
 * Device Code Flow: el server pollea a Twitch hasta que el usuario autoriza;
 * aca solo se abre la pagina de activacion (twitch.tv/activate, con el
 * codigo prefilled) y el resultado llega por WS (twitch-auth-ready /
 * twitch-auth-error). En Electron window.open() se deriva al navegador del
 * sistema; en navegador el popup se abre sincronicamente dentro del gesto
 * del click, porque window.open() tras un await pierde la activacion de
 * usuario y se bloquea en silencio.
 */
export async function startOAuthFlow(provider) {
  const isElectron = !!window.electronAPI;
  const popup = isElectron ? null : window.open('about:blank', '_blank');
  try {
    const res = await fetch(`/api/auth/${provider}/start`);
    const data = await res.json();
    if (!res.ok || !data.url) { if (popup) popup.close(); showToast(tErr(data, 'toast.testError')); return; }
    showToast(data.userCode
      ? t('toast.twitchAuthorizeInBrowser', { code: data.userCode })
      : t('toast.twitchAuthorizeWindow'));
    if (provider === 'twitch' && data.userCode) {
      const twText = document.getElementById('twitchAuthStatusText');
      if (twText) twText.textContent = t('conn.twitchWaitingCode', { code: data.userCode });
    }
    if (popup) popup.location.href = data.url;
    else if (isElectron) window.open(data.url, '_blank'); // windowOpenHandler -> shell.openExternal
    else window.location.href = data.url; // Popup bloqueado: ultima opcion
  } catch (e) { if (popup) popup.close(); showToast(t('toast.testError')); }
}

export function connectTwitchAuth() { return startOAuthFlow('twitch'); }

export async function disconnectTwitchAuth() {
  try { await fetch('/api/auth/twitch/disconnect', { method: 'POST' }); } catch (_) { /* noop */ }
}

export function updateOAuthStatusUI(status) {
  if (!status) return;
  const tw = status.twitch || {};

  const twBtnC = document.getElementById('btnConnectTwitchAuth');
  const twBtnD = document.getElementById('btnDisconnectTwitchAuth');
  const twText = document.getElementById('twitchAuthStatusText');
  if (twBtnC) twBtnC.style.display = tw.connected ? 'none' : 'inline-block';
  if (twBtnD) twBtnD.style.display = tw.connected ? 'inline-block' : 'none';
  if (twText) {
    twText.textContent = !tw.connected
      ? 'Sin conectar — solo llegarán sub/bits/raids (sin follows con nombre)'
      : `Conectado como ${tw.login || '—'} — Follows: ${tw.followActive ? 'activo' : 'reconectando...'}`;
  }
}

export async function loadOAuthStatusUI() {
  try {
    const res = await fetch('/api/oauth/status');
    updateOAuthStatusUI(await res.json());
  } catch (_) { /* noop */ }
}
