/**
 * i18n minimo para los overlays vanilla (sin interpolacion {var} — los
 * overlays no la necesitan). Reemplaza las 9 copias de t()/loadLocale con
 * 4 firmas distintas de los overlays + mobile.html.
 */

let _locale = {};
let _lang = 'es';

export function idiomaOverlay() {
  return _lang;
}

export async function cargarLocaleOverlay() {
  try {
    _lang = localStorage.getItem('tikliveTTS_lang') || 'es';
  } catch (_) {
    _lang = 'es';
  }
  try {
    _locale = await (await fetch(`/locales/${_lang}.json`)).json();
  } catch (_) {
    try { _locale = await (await fetch('/locales/es.json')).json(); } catch (__) { /* noop */ }
  }
  return _locale;
}

export function t(key) {
  const parts = key.split('.');
  let val = _locale;
  for (const p of parts) {
    val = val?.[p];
    if (val === undefined) break;
  }
  return typeof val === 'string' ? val : key;
}

export function aplicarI18nOverlay(raiz = document) {
  raiz.querySelectorAll('[data-i18n]').forEach((el) => {
    const v = t(el.dataset.i18n);
    if (v !== el.dataset.i18n) el.textContent = v;
  });
}
