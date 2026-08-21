'use strict';

function oauthStatusPayload(state) {
  return {
    twitch: {
      connected: !!state.authTokens.twitch,
      login: (state.authTokens.twitch && state.authTokens.twitch.login) || null,
      followActive: state.eventsub.followActive,
    },
  };
}

function broadcastOauthStatus(deps) {
  deps.bus.emit('ws:broadcast', { type: 'oauth-status-changed', ...oauthStatusPayload(deps.state) });
}

module.exports = { oauthStatusPayload, broadcastOauthStatus };
