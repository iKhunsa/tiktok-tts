import { showToast } from './toast.js';
import { t } from '../../nucleo/i18n/i18n.js';
import { updateRlBadge, toggleRateLimit } from './rate-limit.js';
import { applyA11ySelf } from './accesibilidad.js';

/** Hidrata los 2 paneles (rate limit, general) y aplica a11y desde el unico GET
 * /api/config del arranque original. */
export async function loadConfig() {
  try {
    const res = await fetch('/api/config');
    const cfg = await res.json();

    document.getElementById('rlEnabled').checked = cfg.rateLimitEnabled;
    document.getElementById('rlMax').value = cfg.TTS_RATE_LIMIT_MAX;
    document.getElementById('rlMaxVal').textContent = cfg.TTS_RATE_LIMIT_MAX;
    document.getElementById('rlWindow').value = Math.round(cfg.TTS_RATE_WINDOW_MS / 1000);
    document.getElementById('rlWindowVal').textContent = Math.round(cfg.TTS_RATE_WINDOW_MS / 1000);
    document.getElementById('rlQueue').value = cfg.MAX_QUEUE_MSG;
    document.getElementById('rlQueueVal').textContent = cfg.MAX_QUEUE_MSG;

    document.getElementById('cfgChars').value = cfg.TTS_MAX_CHARS;
    document.getElementById('cfgCharsVal').textContent = cfg.TTS_MAX_CHARS;
    document.getElementById('cfgDebounce').value = cfg.LIKE_DEBOUNCE_MS;
    document.getElementById('cfgDebounceVal').textContent = cfg.LIKE_DEBOUNCE_MS;

    applyA11ySelf(cfg);

    updateRlBadge(cfg.rateLimitEnabled);
  } catch (e) {
    showToast(t('adv.errorLoadConfig'));
  }
}

export function iniciarCargaInicial() {
  loadConfig().then(() => toggleRateLimit());
}
