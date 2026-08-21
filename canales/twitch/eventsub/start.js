'use strict';

function startTwitchEventSub(deps) {
  const { state } = deps;
  if (!state.authTokens.twitch) return;
  require('./stop').stopTwitchEventSub(deps, 'restart');
  state.eventsub.stopped = false;
  state.eventsub.reconnectAttempts = 0;
  require('./connect-socket').connectTwitchEventSubSocket(deps, 'wss://eventsub.wss.twitch.tv/ws');
}

module.exports = { startTwitchEventSub };
