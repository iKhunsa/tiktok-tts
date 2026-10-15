'use strict';

// TikTok no decodifica el rol de moderador (ver tiktok-live-client): solo el
// club de fans, que equivale a "suscriptor".
function tiktokMeta(raw) {
  return { avatar: raw.avatarUrl || '', isModerator: false, isSubscriber: Boolean(raw.isFanClubMember) };
}

module.exports = { tiktokMeta };
