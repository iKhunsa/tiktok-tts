/**
 * i18n unico del frontend. Reemplaza las 9 copias de t()/loadLocale con 4
 * firmas distintas que existian en index.html, advanced.html, mobile.html
 * y los 7 overlays. Soporta interpolacion {var} y data-i18n-html/-placeholder
 * /-title (superset de todas las variantes viejas).
 */

const I18N_KEY = 'tikliveTTS_lang';

let _locale = {};
let _lang = 'es';

function _get(obj, path) {
  return path.split('.').reduce((o, k) => (o && o[k] !== undefined ? o[k] : null), obj);
}

/** @param {string} key @param {Record<string,string|number>} [vars] */
export function t(key, vars) {
  const val = _get(_locale, key);
  if (val === null) return key;
  if (!vars) return val;
  return val.replace(/\{(\w+)\}/g, (_, k) => (vars[k] !== undefined ? vars[k] : `{${k}}`));
}

/** Traduce el error de una respuesta de API: prefiere errorKey sobre error literal. */
export function tErr(data, fallbackKey) {
  const key = data && data.errorKey;
  if (key) {
    const translated = t(key);
    if (translated !== key) return translated;
  }
  return (data && data.error) || (fallbackKey ? t(fallbackKey) : '');
}

export function idiomaActual() {
  return _lang;
}

/** Aplica el locale cargado a todo el markup estatico con data-i18n*. */
export function aplicarTraducciones(raiz = document) {
  raiz.querySelectorAll('[data-i18n]').forEach((el) => {
    const val = t(el.dataset.i18n);
    if (val !== el.dataset.i18n) el.textContent = val;
  });
  raiz.querySelectorAll('[data-i18n-html]').forEach((el) => {
    const val = t(el.dataset.i18nHtml);
    if (val !== el.dataset.i18nHtml) el.innerHTML = val;
  });
  raiz.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    const val = t(el.dataset.i18nPlaceholder);
    if (val !== el.dataset.i18nPlaceholder) el.placeholder = val;
  });
  raiz.querySelectorAll('[data-i18n-title]').forEach((el) => {
    const val = t(el.dataset.i18nTitle);
    if (val !== el.dataset.i18nTitle) el.title = val;
  });
}

/** Carga /locales/<lang>.json con fallback a es.json. No aplica al DOM. */
export async function cargarIdioma(lang) {
  try {
    const res = await fetch(`/locales/${lang}.json`);
    if (!res.ok) throw new Error('not found');
    _locale = await res.json();
  } catch (_) {
    if (lang !== 'es') {
      const fallback = await fetch('/locales/es.json');
      _locale = await fallback.json();
    }
  }
  _lang = lang;
  return _locale;
}

/** Persiste el idioma elegido y lo carga. */
export function setIdioma(lang) {
  try { localStorage.setItem(I18N_KEY, lang); } catch (_) { /* noop */ }
  return cargarIdioma(lang);
}

export function idiomaGuardado() {
  try { return localStorage.getItem(I18N_KEY); } catch (_) { return null; }
}

export function detectarIdiomaNavegador(idiomasDisponibles) {
  const short = (navigator.language || 'en').toLowerCase().split('-')[0];
  return idiomasDisponibles.includes(short) ? short : 'en';
}
