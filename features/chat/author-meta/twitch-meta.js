'use strict';

const isTwitchFlag = (value) => value === true || value === '1';

// El IRC de Twitch no manda foto de perfil.
function twitchMeta({ tags = {} }) {
  const badges = tags.badges || {};
  return {
    avatar: '',
    isModerator: isTwitchFlag(tags.mod) || 'moderator' in badges || 'broadcaster' in badges,
    isSubscriber: isTwitchFlag(tags.subscriber) || 'subscriber' in badges,
  };
}

module.exports = { twitchMeta };
