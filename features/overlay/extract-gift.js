'use strict';

/**
 * Normaliza el payload crudo de `canal:gift` por plataforma a una forma
 * comun que el resto del handler (Top Donadores, broadcast WS) consume sin
 * saber de donde vino. `giftName` queda null para las plataformas sin
 * nombre de regalo real (Twitch/Kick) — el cliente arma el texto con `t()`
 * a partir de `kind`, nunca hardcodeado server-side (regla de i18n del
 * proyecto, ver interfaz/overlay-alertas.js#showAlert).
 *
 * `kind` es null para TikTok (siempre tiene giftName real); para el resto
 * es 'cheer' | 'sub' | 'kicksgift'. `amount` es la magnitud generica (bits
 * del cheer, cantidad de Kicks regalados) — 0 para TikTok y para subs.
 */
function extraerRegalo(platform, raw) {
  if (platform === 'tiktok') {
    return {
      userId: raw.uniqueId, nickname: raw.nickname, avatar: raw.avatarUrl || null,
      giftName: raw.giftName, giftId: raw.giftId, giftPictureUrl: raw.giftPictureUrl || null,
      kind: null, amount: 0,
      // tiktok-live-client manda groupCount (conteo acumulado del combo, ya
      // deduplicado por connect-tiktok-channel.js#GIFT_COMBO_DEBOUNCE_MS).
      repeatCount: raw.groupCount || 1, diamondCount: raw.diamondCount || 0,
    };
  }

  if (platform === 'twitch') {
    if (raw.kind === 'cheer') {
      const tags = raw.tags || {};
      return {
        userId: tags['user-id'] || null, nickname: tags['display-name'] || tags.username, avatar: null,
        giftName: null, giftId: null, giftPictureUrl: null,
        kind: 'cheer', amount: Number(tags.bits) || 0, repeatCount: 1, diamondCount: 0,
      };
    }
    const userstate = raw.userstate || {};
    return {
      userId: userstate['user-id'] || null, nickname: userstate['display-name'] || raw.username, avatar: null,
      giftName: null, giftId: null, giftPictureUrl: null,
      kind: 'sub', amount: 0, repeatCount: 1, diamondCount: 0,
    };
  }

  if (platform === 'kick') {
    // Llega via el webhook de cuenta vinculada (plataforma:evento), nunca
    // por el Centrifugo anonimo del chat — ver features/overlay/index.js.
    const sender = raw.sender || {};
    const gift = raw.gift || {};
    return {
      userId: sender.user_id != null ? String(sender.user_id) : null, nickname: sender.username, avatar: null,
      giftName: null, giftId: null, giftPictureUrl: null,
      kind: 'kicksgift', amount: Number(gift.amount) || 0, repeatCount: 1, diamondCount: 0,
    };
  }

  return null;
}

module.exports = { extraerRegalo };
