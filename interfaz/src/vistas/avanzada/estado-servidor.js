import { t } from '../../nucleo/i18n/i18n.js';
import { showToast } from './toast.js';

let statusRefreshId = null;

export async function refreshStatus() {
  try {
    const res = await fetch('/api/status');
    const data = await res.json();

    const mins = Math.floor(data.uptime / 60);
    const hrs = Math.floor(mins / 60);
    document.getElementById('statUptime').textContent = hrs > 0 ? `${hrs}h ${mins % 60}m` : `${mins}m`;
    document.getElementById('statClients').textContent = data.wsClients;
    document.getElementById('statConn').textContent = data.connected ? t('adv.statConnected') : t('adv.statOff');
    document.getElementById('statConn').style.color = data.connected ? 'var(--green)' : 'var(--muted)';
    document.getElementById('statMem').textContent = data.memoryMB;
    document.getElementById('statRateMax').textContent = data.config.TTS_RATE_LIMIT_MAX;
    document.getElementById('statRateEnabled').textContent = data.config.rateLimitEnabled ? 'ON' : 'OFF';
    document.getElementById('statRateEnabled').style.color = data.config.rateLimitEnabled ? 'var(--green)' : 'var(--muted)';

    document.getElementById('statusRateEnabled').textContent = data.config.rateLimitEnabled ? t('adv.statusYes') : t('adv.statusNo');
    document.getElementById('statusRateEnabled').style.color = data.config.rateLimitEnabled ? 'var(--green)' : 'var(--muted)';
    document.getElementById('statusRateMax').textContent = data.config.TTS_RATE_LIMIT_MAX;
    document.getElementById('statusRateWindow').textContent = (data.config.TTS_RATE_WINDOW_MS / 1000) + 's';
    document.getElementById('statusMaxChars').textContent = data.config.TTS_MAX_CHARS;
    document.getElementById('statusDebounce').textContent = data.config.LIKE_DEBOUNCE_MS + 'ms';
  } catch (e) {
    showToast(t('adv.errorServerUnavailable'));
  }
}

/** Poll cada 5s, pausado mientras la pestaña esta oculta (misma logica que
 * el original: matar el interval en visibilitychange y recrearlo al volver,
 * con un refresh inmediato). */
export function iniciarPollingEstado() {
  statusRefreshId = setInterval(refreshStatus, 5000);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      clearInterval(statusRefreshId);
    } else {
      statusRefreshId = setInterval(refreshStatus, 5000);
      refreshStatus();
    }
  });
}
