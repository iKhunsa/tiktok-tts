/**
 * Config que el servidor le empuja al cliente al arrancar y por WS
 * (config-updated): limites de TTS, accesibilidad, y el interruptor de
 * "leer no seguidores". Portado 1:1 desde index.html.
 */
import { appSettings } from './ajustes-app.js';
import { t } from '../i18n/i18n.js';
import { showToast } from '../../componentes/toast.js';
import { syncTtsVoiceLang } from '../../vistas/principal/voces.js';

export let CHAT_TTS_MAX_LEN = 200;
export let MAX_QUEUE_SIZE = 15;

export async function loadRuntimeConfig() {
  try {
    const res = await fetch('/api/config');
    if (!res.ok) return;
    const cfg = await res.json();
    if (Number.isInteger(cfg.TTS_MAX_CHARS) && cfg.TTS_MAX_CHARS > 0) CHAT_TTS_MAX_LEN = cfg.TTS_MAX_CHARS;
    if (Number.isInteger(cfg.MAX_QUEUE_MSG) && cfg.MAX_QUEUE_MSG > 0) MAX_QUEUE_SIZE = cfg.MAX_QUEUE_MSG;
    // El cliente es la autoridad de su voz TTS: si el backend quedo con otro
    // ttsVoiceLang (patch viejo perdido, carrera de arranque), lo corrige.
    if (appSettings.voice && cfg.ttsVoiceLang !== appSettings.voice) {
      syncTtsVoiceLang(appSettings.voice);
    }
    applyA11yConfig(cfg);
    applyReadNonFollowers(cfg);
  } catch (e) { /* config no disponible aun; se reintenta en el proximo ciclo */ }
}

/** El servidor decide que mensajes puede leer el TTS (ttsBlocked); aca solo se refleja el estado del interruptor. */
export function applyReadNonFollowers(cfg) {
  const el = document.getElementById('ttsReadNonFollowersToggle');
  if (!el) return;
  const on = cfg.ttsReadNonFollowers !== false;
  el.checked = on;
  document.getElementById('chip-nonfollowers')?.classList.toggle('active', on);
}

export function setReadNonFollowers(value) {
  document.getElementById('chip-nonfollowers')?.classList.toggle('active', !!value);
  fetch('/api/config', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ttsReadNonFollowers: !!value }),
  })
    .then((res) => {
      if (!res.ok) throw new Error('http');
      showToast(t(value ? 'toast.readNonFollowersOn' : 'toast.readNonFollowersOff'));
    })
    .catch(() => {
      showToast(t('mod.toast.error'));
      loadRuntimeConfig();
    });
}

export function applyA11yConfig(cfg) {
  if (cfg.a11yUiFontScale) {
    document.body.style.zoom = cfg.a11yUiFontScale;
  }
  document.body.classList.toggle('high-contrast', !!cfg.a11yHighContrast);
  document.body.classList.toggle('reduce-motion', !!cfg.a11yReduceMotion);
}
