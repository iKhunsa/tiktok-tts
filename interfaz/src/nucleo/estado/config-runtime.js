/**
 * Config que el servidor le empuja al cliente al arrancar y por WS
 * (config-updated): limites de TTS, accesibilidad, el interruptor de
 * "leer no seguidores" y el filtro de idioma/diccionario de voz. Portado
 * 1:1 desde index.html.
 *
 * langFilterEnabled/dictFilterEnabled/allowedExtraLangs (fase-05): fuente
 * unica de verdad = config.json del servidor, porque es lo que
 * `idioma/index.js` usa de verdad para filtrar mensajes server-side.
 * Antes vivian TAMBIEN duplicados en localStorage (appSettings), lo que
 * permitia que quedaran desincronizados (ej: reset de config.json en el
 * servidor, o un segundo dispositivo pateando el valor) sin que el
 * checkbox de esta pestaña se enterara nunca, porque nada volvia a leer
 * el server para refrescarlo. Ahora viven solo en memoria aca, hidratados
 * siempre desde /api/config (arranque + cada config-updated por WS).
 */
import { appSettings, SETTINGS_KEY } from './ajustes-app.js';
import { t } from '../i18n/i18n.js';
import { showToast } from '../../componentes/toast.js';
import { syncTtsVoiceLang } from '../../vistas/principal/voces.js';

export let CHAT_TTS_MAX_LEN = 200;
export let MAX_QUEUE_SIZE = 15;

export let langFilterEnabled = false;
export let dictFilterEnabled = false;
export let allowedExtraLangs = [];

const MIGRACION_LANGFILTER_FLAG = 'tikliveTTS_langFilterMigrated_v1';

/** Migracion unica: las 3 claves vivian antes en localStorage
 * (tikliveTTS_v1) ademas de en el servidor. Si una instalacion vieja
 * tiene un valor ahi que el servidor todavia no vio, se lo empuja una
 * sola vez (guardado con una bandera aparte para no repetirlo en cada
 * arranque) y despues se olvida — a partir de aca el servidor manda. */
function migrarLangFilterLegacy() {
  if (localStorage.getItem(MIGRACION_LANGFILTER_FLAG)) return null;
  localStorage.setItem(MIGRACION_LANGFILTER_FLAG, '1');
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const legacy = {};
    let tieneAlgo = false;
    if (typeof parsed.langFilterEnabled === 'boolean') { legacy.langFilterEnabled = parsed.langFilterEnabled; tieneAlgo = true; }
    if (typeof parsed.dictFilterEnabled === 'boolean') { legacy.dictFilterEnabled = parsed.dictFilterEnabled; tieneAlgo = true; }
    if (Array.isArray(parsed.allowedExtraLangs) && parsed.allowedExtraLangs.length) { legacy.allowedExtraLangs = parsed.allowedExtraLangs; tieneAlgo = true; }
    return tieneAlgo ? legacy : null;
  } catch (e) { return null; }
}

export async function loadRuntimeConfig() {
  const legacy = migrarLangFilterLegacy();
  if (legacy) {
    await fetch('/api/config', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(legacy),
    }).catch(() => { /* si falla, el proximo config-updated/reintento no vuelve a insistir: se prioriza no repetir el prompt sobre no perder el dato una vez */ });
  }
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
    applyFiltroIdiomaConfig(cfg);
  } catch (e) { /* config no disponible aun; se reintenta en el proximo ciclo */ }
}

/** Hidrata el estado en memoria + los 2 checkboxes de esta pantalla desde
 * la config real del servidor. Se llama al arrancar y en cada
 * config-updated (WS) para que un cambio hecho en otra pestaña/dispositivo
 * se refleje aca sin recargar. */
export function applyFiltroIdiomaConfig(cfg) {
  langFilterEnabled = !!cfg.langFilterEnabled;
  dictFilterEnabled = !!cfg.dictFilterEnabled;
  allowedExtraLangs = Array.isArray(cfg.allowedExtraLangs) ? cfg.allowedExtraLangs : [];

  const langFilterCb = document.getElementById('langFilterToggle');
  if (langFilterCb) {
    langFilterCb.checked = langFilterEnabled;
    langFilterCb.closest('.toggle-chip')?.classList.toggle('active', langFilterEnabled);
  }
  const dictFilterCb = document.getElementById('dictFilterToggle');
  if (dictFilterCb) {
    dictFilterCb.checked = dictFilterEnabled;
    dictFilterCb.closest('.toggle-chip')?.classList.toggle('active', dictFilterEnabled);
  }
}

function patchFiltroIdioma(patch) {
  return fetch('/api/config', {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(patch),
  }).catch(() => { /* config-patch ya reporta a GlitchTip via patchConfigSetting en los otros ajustes; este PATCH directo alcanza para el caso comun */ });
}

export function setLangFilterEnabled(enabled) {
  langFilterEnabled = !!enabled;
  patchFiltroIdioma({ langFilterEnabled });
}

export function setDictFilterEnabled(enabled) {
  dictFilterEnabled = !!enabled;
  patchFiltroIdioma({ dictFilterEnabled });
}

export function setAllowedExtraLang(lang, enabled) {
  const langs = new Set(allowedExtraLangs);
  if (enabled) langs.add(lang); else langs.delete(lang);
  allowedExtraLangs = [...langs];
  patchFiltroIdioma({ allowedExtraLangs });
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
