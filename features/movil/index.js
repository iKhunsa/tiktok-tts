'use strict';

const { createMobileState } = require('./state/mobile-state');
const { validateMobileRequest } = require('./validate-request');
const { mobilePage } = require('./routes/mobile-page');
const { localIp } = require('./routes/local-ip');
const { qr } = require('./routes/qr');
const { state: stateRoute } = require('./routes/state');
const { command } = require('./routes/command');
const { MOBILE_ALLOWED_ACTIONS } = require('./allowed-actions');
const { hasDesktopClient } = require('./has-desktop-client');
const mcpRegistry = require('../../core/contracts/mcp-registry');

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

    // ── MCP ──────────────────────────────────────────────────────────────
    mcpRegistry.registerStateProvider(() => ({
      mobile: {
        ttsGlobalEnabled: mobileState.ttsGlobalEnabled,
        ttsPaused: mobileState.ttsPaused,
        streamTimerRunning: mobileState.streamTimerRunning,
        options: mobileState.options,
      },
    }), 'movil');

    mcpRegistry.registerTool({
      name: 'remote_command', domain: 'movil',
      title: 'Remote command',
      description: `Send a control command to the desktop (same set as the mobile panel). Actions: ${[...MOBILE_ALLOWED_ACTIONS].join(', ')}.`,
      inputSchema: {
        type: 'object', required: ['action'],
        properties: {
          action: { type: 'string' },
          value: { type: 'number', description: 'For musicVolume (0-1)' },
          soundId: { type: 'string', description: 'For soundpadPlay' },
          clipId: { type: 'string', description: 'For deleteClip' },
        },
      },
      handler: (a) => {
        if (!MOBILE_ALLOWED_ACTIONS.has(a.action)) return { ok: false, reason: 'accion_no_valida' };
        bus.emit('movil:comando', { action: a.action, value: a.value, soundId: a.soundId, clipId: a.clipId });
        if (a.action === 'markClip') return { ok: true };
        if (!hasDesktopClient(wss)) return { ok: false, reason: 'desktop-offline' };
        bus.emit('ws:broadcast', { type: 'remote-cmd', action: a.action, value: a.value, soundId: a.soundId, clipId: a.clipId });
        return { ok: true };
      },
    });

    return { rutas: 5, listeners: 1 };
  },
};
