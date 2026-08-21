'use strict';

const { emitChatMessage } = require('./emit-chat-message');
const { testChat } = require('./routes/test-chat');

module.exports = {
  name: 'chat',

  register({ app, bus, logger }) {
    const deps = { bus, logger };

    bus.on('canal:mensaje-crudo', emitChatMessage(deps), 'chat');
    app.post('/api/test/chat', testChat(deps));

    return { rutas: 1, listeners: 1 };
  },
};
