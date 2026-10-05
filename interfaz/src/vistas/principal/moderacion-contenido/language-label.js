import { t, idiomaActual } from '../../../nucleo/i18n/i18n.js';
import { LOCALES, SPANISH_LOCALES } from './chat-guard-options.js';

// Los locales con labelKey tienen texto propio; el resto lo nombra el navegador
// (Intl.DisplayNames) en el idioma de la UI, sin traducir a mano 10 idiomas x 9.
export function languageLabel(locale) {
  if (locale.labelKey) return t(locale.labelKey);
  try {
    const name = new Intl.DisplayNames([idiomaActual()], { type: 'language' }).of(locale.displayCode);
    return name ? name.charAt(0).toLocaleUpperCase(idiomaActual()) + name.slice(1) : locale.code;
  } catch {
    return locale.code;
  }
}

// «Español (todas las variantes), Inglés» en lugar de diez nombres seguidos.
export function effectiveLanguagesText(codes) {
  const allSpanish = SPANISH_LOCALES.every((code) => codes.includes(code));
  const others = LOCALES.filter((locale) => codes.includes(locale.code) && !(allSpanish && SPANISH_LOCALES.includes(locale.code)));
  return [...(allSpanish ? [t('chatGuard.lang.allSpanish')] : []), ...others.map(languageLabel)].join(', ');
}
