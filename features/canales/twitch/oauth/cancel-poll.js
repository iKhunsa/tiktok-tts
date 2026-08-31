'use strict';

function cancelTwitchDevicePoll(state) {
  if (state.pendingOAuth.twitch && state.pendingOAuth.twitch.timer) {
    clearTimeout(state.pendingOAuth.twitch.timer);
  }
  state.pendingOAuth.twitch = null;
}

module.exports = { cancelTwitchDevicePoll };
