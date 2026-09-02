import { t, tErr } from '../../nucleo/i18n/i18n.js';
import { showToast } from './toast.js';
import { readIntField, flashSave } from './campos-utils.js';
import { refreshStatus } from './estado-servidor.js';

export function updateRlBadge(enabled) {
  const badge = document.getElementById('rlBadge');
  badge.textContent = enabled ? 'ON' : 'OFF';
  badge.className = 'badge ' + (enabled ? 'badge-on' : 'badge-off');
}

export function toggleRateLimit() {
  const enabled = document.getElementById('rlEnabled').checked;
  updateRlBadge(enabled);
  ['rlMax', 'rlWindow', 'rlQueue'].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.disabled = !enabled;
    el.closest('.control-group').style.opacity = enabled ? '1' : '0.4';
    el.closest('.control-group').style.pointerEvents = enabled ? '' : 'none';
  });
}

export async function saveRateLimit() {
  const rlMax = readIntField('rlMax', 'Máx. mensajes');
  if (rlMax === null) return;
  const rlWindowSec = readIntField('rlWindow', 'Ventana (segundos)');
  if (rlWindowSec === null) return;
  const rlQueue = readIntField('rlQueue', 'Tamaño de cola');
  if (rlQueue === null) return;

  const payload = {
    rateLimitEnabled: document.getElementById('rlEnabled').checked,
    TTS_RATE_LIMIT_MAX: rlMax,
    TTS_RATE_WINDOW_MS: rlWindowSec * 1000,
    MAX_QUEUE_MSG: rlQueue,
  };
  try {
    const res = await fetch('/api/config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(tErr(data, 'adv.configRejected'));
    flashSave('btnSaveRL');
    showToast(t('adv.savedRateLimit'));
    refreshStatus();
  } catch (e) {
    showToast(e.message || t('adv.errorLoadConfig'));
  }
}
