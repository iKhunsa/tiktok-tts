'use strict';

// El evento de Pusher de Kick no trae foto; los roles los resuelve
// canales/kick/handle-event.js desde sender.identity.badges.
function kickMeta(raw) {
  return { avatar: '', isModerator: Boolean(raw.isModerator), isSubscriber: Boolean(raw.isSubscriber) };
}

module.exports = { kickMeta };
