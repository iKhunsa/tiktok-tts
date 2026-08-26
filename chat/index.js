'use strict';

const { emitChatMessage, resetAdminAnnounce } = require('./emit-chat-message');
const { testChat } = require('./routes/test-chat');

module.exports = {
  name: 'chat',

  register({ app, bus, logger }) {
    const deps = { bus, logger };

    bus.on('canal:mensaje-crudo', emitChatMessage(deps), 'chat');

    // Una desconexion (de cualquier plataforma/canal) cuenta como fin de
    // sesion para el aviso del creador — al reconectar y volver a escribir,
    // debe anunciar de nuevo en vez de quedar "gastado" para siempre.
    bus.on('canal:estado', (payload) => {
      if (payload && payload.state === 'desconectado') resetAdminAnnounce();
    }, 'chat');

    app.post('/api/test/chat', testChat(deps));

    return { rutas: 1, listeners: 2 };
  },
};
