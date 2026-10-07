import { t } from './i18n.js';

/** Nombre que dice la VOZ para el autor de un evento/mensaje. El servidor
 *  manda `ttsUser` ('' = sin nombre pronunciable); builds viejos no lo
 *  mandan y se cae al nombre visible `user`. */
export function nombreHablado(data) {
  if (data.ttsUser === undefined) return data.user;
  return data.ttsUser || t('announce.anonymousUser');
}
