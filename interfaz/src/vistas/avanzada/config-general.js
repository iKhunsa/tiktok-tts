import { t, tErr } from '../../nucleo/i18n/i18n.js';
import { showToast } from './toast.js';
import { readIntField, flashSave } from './campos-utils.js';
import { refreshStatus } from './estado-servidor.js';

export async function saveGeneral() {
  const maxChars = readIntField('cfgChars', 'Máx. caracteres');
  if (maxChars === null) return;
  const debounce = readIntField('cfgDebounce', 'Debounce de likes');
  if (debounce === null) return;

  const payload = {
    TTS_MAX_CHARS: maxChars,
    LIKE_DEBOUNCE_MS: debounce,
  };
  try {
    const res = await fetch('/api/config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(tErr(data, 'adv.configRejected'));
    flashSave('btnSaveGeneral');
    showToast(t('adv.savedGeneral'));
    refreshStatus();
  } catch (e) {
    showToast(e.message || t('adv.errorLoadConfig'));
  }
}
