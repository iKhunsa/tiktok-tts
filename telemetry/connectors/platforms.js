'use strict';

// Conexiones y desconexiones de chat.

function attach(bus, track, { markPlatform }) {
  bus.on('platform:connected', ({ platform, channels, authed } = {}) => {
    if (!platform) return;
    markPlatform(platform);
    track('platforms', 'connected', {
      platform,
      channels: channels || 1,
      authed: !!authed,
    });
  });

  bus.on('platform:disconnected', ({ platform } = {}) => {
    if (platform) track('platforms', 'disconnected', { platform });
  });

  bus.on('platform:reconnect-failed', ({ platform, attempts } = {}) => {
    if (platform) track('platforms', 'reconnect_failed', { platform, attempts: attempts || null });
  });
}

module.exports = { name: 'platforms', attach };
