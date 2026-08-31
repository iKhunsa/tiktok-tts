'use strict';

const { emitChatMessage, resetAdminAnnounce } = require('./emit-chat-message');
const { testChat } = require('./routes/test-chat');

module.exports = {
  name: 'chat',

  register({ app, bus, logger }) {
    const deps = { bus, logger };

    bus.on('canal:mensaje-crudo', emitChatMessage(deps), 'chat');

    // Cuando se cae el ultimo canal conectado, la sesion termina para el aviso
    // del creador — al reconectar y volver a escribir, debe anunciar de nuevo
    // en vez de quedar "gastado" para siempre. Se cubren los 3 caminos:
    //  - 'desconectado': un canal de una plataforma con otros aun activos no
    //    resetea; pero Twitch/YouTube/Kick emiten esto siempre (incl. el
    //    ultimo), y el reset extra es inocuo si ya no queda nada.
    //  - 'sin-canales': TikTok al caer su ultimo canal (boton, "desconectar
    //    todos", o reintentos agotados) — nunca emite 'desconectado'.
    //  - 'lista-canales' con total 0: red de seguridad que cuenta las 4
    //    plataformas de una (mismo patron que promo/index.js).
    bus.on('canal:estado', (payload) => {
      if (!payload) return;
      if (payload.state === 'desconectado' || payload.state === 'sin-canales') {
        resetAdminAnnounce();
        return;
      }
      if (payload.state === 'lista-canales') {
        const total = ['tiktok', 'twitch', 'youtube', 'kick']
          .reduce((s, p) => s + (Array.isArray(payload[p]) ? payload[p].length : 0), 0);
        if (total === 0) resetAdminAnnounce();
      }
    }, 'chat');

    app.post('/api/test/chat', testChat(deps));

    return { rutas: 1, listeners: 2 };
  },
};
