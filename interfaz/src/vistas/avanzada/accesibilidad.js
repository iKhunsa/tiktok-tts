import { t, tErr } from '../../nucleo/i18n/i18n.js';
import { showToast } from './toast.js';

/** Aplica a11y al DOM de esta misma pagina (zoom + alto contraste). El
 * resto de vistas (index/mobile) tienen su propio applyA11yConfig, cada
 * una porque aplica a un DOM distinto — ver nota de fase-05 sobre
 * duplicacion de config aun no resuelta. */
export function applyA11ySelf(cfg) {
  if (cfg.a11yUiFontScale) document.body.style.zoom = cfg.a11yUiFontScale;
  document.body.classList.toggle('high-contrast', !!cfg.a11yHighContrast);
}

export async function saveAccessibility() {
  const payload = {
    a11yReduceMotion: document.getElementById('a11yReduceMotion').checked,
    ttsSlowSpeech: document.getElementById('a11ySlowSpeech').checked,
    a11yHighContrast: document.getElementById('a11yHighContrast').checked,
    a11yUiFontScale: parseFloat(document.getElementById('a11yUiFontScale').value),
  };
  try {
    const res = await fetch('/api/config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(tErr(data, 'adv.configRejected'));
    applyA11ySelf(payload);
    showToast(t('adv.savedGeneral'));
  } catch (e) {
    showToast(e.message || t('adv.errorLoadConfig'));
  }
}
