// Espejo de core/chat-guard-options.js (el backend valida; esto solo dibuja).
// test/chat-guard-ui.test.js verifica que ambas listas no se desincronicen.
export const LEVELS = ['soft', 'balanced', 'strict', 'custom'];

export const LOCALES = [
  { code: 'es', labelKey: 'chatGuard.lang.es' },
  { code: 'es_419', labelKey: 'chatGuard.lang.esLatam' },
  { code: 'en', labelKey: 'chatGuard.lang.en' },
  { code: 'es_ar', labelKey: 'chatGuard.lang.esAr' },
  { code: 'es_cl', labelKey: 'chatGuard.lang.esCl' },
  { code: 'es_co', labelKey: 'chatGuard.lang.esCo' },
  { code: 'es_ec', labelKey: 'chatGuard.lang.esEc' },
  { code: 'es_mx', labelKey: 'chatGuard.lang.esMx' },
  { code: 'es_pe', labelKey: 'chatGuard.lang.esPe' },
  { code: 'es_ve', labelKey: 'chatGuard.lang.esVe' },
  // Idiomas nuevos: el nombre lo da Intl.DisplayNames en el idioma de la UI (language-label.js).
  { code: 'pt', displayCode: 'pt' },
  { code: 'pt_br', displayCode: 'pt-BR' },
  { code: 'fr', displayCode: 'fr' },
  { code: 'de', displayCode: 'de' },
  { code: 'it', displayCode: 'it' },
  { code: 'ja', displayCode: 'ja' },
  { code: 'ko', displayCode: 'ko' },
  { code: 'ru', displayCode: 'ru' },
  { code: 'zh', displayCode: 'zh' },
];

export const SPANISH_LOCALES = ['es', 'es_419', 'es_ar', 'es_cl', 'es_co', 'es_ec', 'es_mx', 'es_pe', 'es_ve'];

export const CUSTOM_OPTIONS = ['tricks', 'similar'];
export const MAX_WORD_LENGTH = 40;
export const MAX_RENDERED_WORDS = 200;
export const WORD_LISTS = ['blocked', 'allowed'];
