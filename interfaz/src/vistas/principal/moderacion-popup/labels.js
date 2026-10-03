import { t } from '../../../nucleo/i18n/i18n.js';

const REASON_KEY = {
  'blocked-word': 'blockedWord',
  language: 'language',
  'too-long': 'tooLong',
  'repeated-char': 'repeatedChar',
  flood: 'flood',
  'duplicate-redelivery': 'duplicate',
  banned: 'banned',
  muted: 'muted',
};
const ORIGIN_KEY = {
  usuario: 'user',
  'lista-propia': 'ownList',
  diccionario: 'dictionary',
  'guard-js': 'guard',
  'motor-rust': 'rust',
};

export function reasonLabel(entry) {
  if (entry.origen === 'motor-rust') return t('modPopup.reason.rustCategory', { category: entry.motivo });
  return t(`modPopup.reason.${REASON_KEY[entry.motivo] || 'other'}`);
}

export function originLabel(origen) {
  return t(`modPopup.origin.${ORIGIN_KEY[origen] || 'guard'}`);
}
