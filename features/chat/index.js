'use strict';

const { emitChatMessage, resetAdminAnnounce } = require('./emit-chat-message');
const { testChat } = require('./routes/test-chat');

module.exports = {
  name: 'chat',

  register({ app, bus, logger }) {
    const deps = { bus, logger };
    let prevTotal = 0;

    bus.on('canal:mensaje-crudo', emitChatMessage(deps), 'chat');

    // Ring buffer de los últimos mensajes permitidos — el chat solo se
    // broadcast por WS, sin persistencia. Lo consume GET /api/chat/recent y la
    // tool MCP get_recent_chat (vía el contrato síncrono chat:recientes).
    const recientes = [];
    const RECIENTES_CAP = 200;
    bus.on('chat:mensaje-permitido', (m) => {
      if (!m) return;
      recientes.push({
        platform: m.platform, channel: m.channel, user: m.user, userId: m.userId,
        comment: m.comment, isAdmin: !!m.isAdmin, muted: !!m.muted, ttsBlocked: !!m.ttsBlocked,
        timestamp: m.timestamp,
      });
      if (recientes.length > RECIENTES_CAP) recientes.shift();
    }, 'chat');
    bus.on('chat:recientes', (respond) => {
      if (typeof respond === 'function') respond(recientes.slice());
    }, 'chat');
    app.get('/api/chat/recent', (req, res) => {
      const limit = Math.min(Number(req.query.limit) || 50, RECIENTES_CAP);
      res.json({ messages: recientes.slice(-limit), total: recientes.length });
    });

    // 'desconectado' es por-canal y transitorio (watchdogs de YouTube/Twitch/Kick
    // lo emiten cada pocos minutos con otras plataformas aun activas) — no es fin
    // de sesion, resetear ahi hacia que el aviso del creador re-sonara en casi
    // cada mensaje. La unica senal real de fin de sesion es 'lista-canales' con
    // total 0 (cuenta las 4 plataformas de una, ver broadcast-channels.js), y la
    // transicion 0 -> N re-arma el aviso para la sesion nueva.
    bus.on('canal:estado', (payload) => {
      if (!payload || payload.state !== 'lista-canales') return;
      const total = ['tiktok', 'twitch', 'youtube', 'kick']
        .reduce((s, p) => s + (Array.isArray(payload[p]) ? payload[p].length : 0), 0);
      if (total === 0 || prevTotal === 0) resetAdminAnnounce();
      prevTotal = total;
    }, 'chat');

    app.post('/api/test/chat', testChat(deps));

    return { rutas: 2, listeners: 4 };
  },
};
