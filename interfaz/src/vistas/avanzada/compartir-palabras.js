import { t, tErr } from '../../nucleo/i18n/i18n.js';
import { showToast } from './toast.js';

/** Interruptor opt-in de telemetria de palabras bloqueadas (por cuenta, default off). */
export async function saveBlockedWordsSharing() {
  const input = document.getElementById('blockedWordsTelemetryEnabled');
  const enabled = input.checked;
  try {
    const res = await fetch('/api/config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blockedWordsTelemetryEnabled: enabled }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(tErr(data, 'adv.configRejected'));
    showToast(t(enabled ? 'adv.bwShareOn' : 'adv.bwShareOff'));
  } catch (e) {
    input.checked = !enabled;
    showToast(e.message || t('adv.errorLoadConfig'));
  }
}
