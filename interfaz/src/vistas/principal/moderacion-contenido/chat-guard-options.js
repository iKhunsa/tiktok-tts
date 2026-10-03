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
];

export const CUSTOM_OPTIONS = ['tricks', 'similar'];
export const MAX_WORD_LENGTH = 40;
export const MAX_RENDERED_WORDS = 200;
export const WORD_LISTS = ['blocked', 'allowed'];
