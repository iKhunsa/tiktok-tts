'use strict';

const { createMobileState } = require('./state/mobile-state');
const { validateMobileRequest } = require('./validate-request');
const { mobilePage } = require('./routes/mobile-page');
const { localIp } = require('./routes/local-ip');
const { qr } = require('./routes/qr');
const { state: stateRoute } = require('./routes/state');
const { command } = require('./routes/command');

const PORT = process.env.PORT || 3000;

module.exports = {
  name: 'movil',

  register({ app, wss, bus, logger }) {
    const mobileState = createMobileState();
    const deps = { bus, logger, wss };
    const guard = validateMobileRequest(deps);

    // Espejo de solo lectura: el desktop es la unica fuente de verdad, este
    // dominio solo refleja lo que el desktop confirma via state-sync.
    bus.on('ws:mensaje-entrante', ({ data, markDesktop }) => {
      if (!data || data.type !== 'state-sync' || !data.state || typeof data.state !== 'object') return;
      markDesktop();
      const s = data.state;
      if (typeof s.ttsGlobalEnabled === 'boolean') mobileState.ttsGlobalEnabled = s.ttsGlobalEnabled;
      if (typeof s.ttsPaused === 'boolean') mobileState.ttsPaused = s.ttsPaused;
      if (typeof s.streamTimerRunning === 'boolean') mobileState.streamTimerRunning = s.streamTimerRunning;
      if (s.options && typeof s.options === 'object') mobileState.options = { ...mobileState.options, ...s.options };
      if (Array.isArray(s.clips)) mobileState.clips = s.clips;
      bus.emit('ws:broadcast', { type: 'state-sync', state: { ...mobileState } });
    }, 'movil');

    app.get('/mobile', guard, mobilePage());
    app.get('/api/local-ip', localIp(PORT));
    app.get('/api/mobile/qr', qr(deps, PORT));
    app.get('/api/mobile/state', guard, stateRoute(mobileState));
    app.post('/api/mobile/command', guard, command(deps));

    return { rutas: 5, listeners: 1 };
  },
};
