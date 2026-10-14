import { t } from '../../nucleo/i18n/i18n.js';
import { showToast } from '../../componentes/toast.js';

/** Ajustes de la ventana de escritorio: X → bandeja (config del servidor,
 * la lee main.js al cerrar) y arranque con Windows (registro, via IPC).
 * Siempre visible; el arranque con Windows queda desactivado fuera de
 * Electron (navegador), donde no hay IPC para tocar el registro. */
export async function iniciarAjustesVentana() {
  const api = window.electronAPI;
  const closeToTray = document.getElementById('closeToTrayToggle');
  fetch('/api/config').then((r) => r.json()).then((cfg) => { closeToTray.checked = cfg.closeToTray === true; }).catch(() => {});
  closeToTray.addEventListener('change', () => {
    const on = closeToTray.checked;
    fetch('/api/config', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ closeToTray: on }),
    }).then((res) => { if (!res.ok) throw new Error('http'); })
      .catch(() => { closeToTray.checked = !on; showToast(t('toast.settingSaveFailed', { keys: t('toggle.closeToTray') }), 'error'); });
  });

  const loginItem = await api?.getOpenAtLogin?.().catch(() => null);
  const openAtLogin = document.getElementById('openAtLoginToggle');
  if (!loginItem?.available) {
    openAtLogin.disabled = true;
    document.getElementById('openAtLoginGroup').classList.add('is-disabled');
    return;
  }
  openAtLogin.checked = loginItem.enabled;
  openAtLogin.addEventListener('change', async () => {
    const on = openAtLogin.checked;
    const res = await api.setOpenAtLogin(on).catch(() => null);
    if (!res?.ok) { openAtLogin.checked = !on; showToast(t('toast.settingSaveFailed', { keys: t('toggle.openAtLogin') }), 'error'); }
  });
}
