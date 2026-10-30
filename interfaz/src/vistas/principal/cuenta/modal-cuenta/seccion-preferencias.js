/**
 * Seccion "Preferencias" del modal "Mi cuenta": ajustes de la ventana de
 * escritorio. X → bandeja (config del servidor, la lee main.js al cerrar) y
 * arranque con Windows (registro, via IPC); este ultimo queda desactivado
 * fuera de Electron (navegador), donde no hay IPC para tocar el registro.
 */
import { t, aplicarTraducciones, idiomaGuardado } from '../../../../nucleo/i18n/i18n.js';
import { showToast } from '../../../../componentes/toast.js';

const IDIOMAS = [
  ['es', 'Español'], ['en', 'English'], ['it', 'Italiano'], ['pt', 'Português'], ['fr', 'Français'],
  ['de', 'Deutsch'], ['zh', '中文'], ['ja', '日本語'], ['ko', '한국어'], ['ru', 'Русский'],
];

export async function pintarPreferencias(cont) {
  cont.insertAdjacentHTML('beforeend', `
    <label class="mc-a11y-fila">
      <div>
        <div class="mc-a11y-nombre" data-i18n="toggle.closeToTray"></div>
        <p class="mc-bloque-desc" data-i18n="toggle.closeToTrayHint"></p>
      </div>
      <span class="switch"><input type="checkbox" data-pref="closeToTray"><span class="switch-track"></span></span>
    </label>
    <label class="mc-a11y-fila">
      <div>
        <div class="mc-a11y-nombre" data-i18n="toggle.openAtLogin"></div>
      </div>
      <span class="switch"><input type="checkbox" data-pref="openAtLogin" disabled><span class="switch-track"></span></span>
    </label>
    <label class="mc-a11y-fila">
      <div class="mc-a11y-nombre" data-i18n="toggle.uiLanguage"></div>
      <select class="mc-idioma" data-pref="uiLanguage">
        ${IDIOMAS.map(([v, n]) => `<option value="${v}">${n}</option>`).join('')}
      </select>
    </label>`);
  aplicarTraducciones(cont);

  // Mismo setLanguage() global que usaba el selector del sidebar; el nombre de
  // cada idioma va en su propio idioma, sin traducir.
  const idioma = cont.querySelector('[data-pref="uiLanguage"]');
  idioma.value = idiomaGuardado() || document.documentElement.lang || 'es';
  idioma.addEventListener('change', () => window.setLanguage?.(idioma.value));

  const closeToTray = cont.querySelector('[data-pref="closeToTray"]');
  fetch('/api/config').then((r) => r.json()).then((cfg) => { closeToTray.checked = cfg.closeToTray === true; }).catch(() => {});
  closeToTray.addEventListener('change', () => {
    const on = closeToTray.checked;
    fetch('/api/config', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ closeToTray: on }),
    }).then((res) => { if (!res.ok) throw new Error('http'); })
      .catch(() => { closeToTray.checked = !on; showToast(t('toast.settingSaveFailed', { keys: t('toggle.closeToTray') }), 'error'); });
  });

  const api = window.electronAPI;
  const loginItem = await api?.getOpenAtLogin?.().catch(() => null);
  if (!loginItem?.available) return;
  const openAtLogin = cont.querySelector('[data-pref="openAtLogin"]');
  openAtLogin.disabled = false;
  openAtLogin.checked = loginItem.enabled;
  openAtLogin.addEventListener('change', async () => {
    const on = openAtLogin.checked;
    const res = await api.setOpenAtLogin(on).catch(() => null);
    if (!res?.ok) { openAtLogin.checked = !on; showToast(t('toast.settingSaveFailed', { keys: t('toggle.openAtLogin') }), 'error'); }
  });
}
