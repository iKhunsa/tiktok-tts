'use strict';

const { parseCommand } = require('./parse-command');
const { getConfigSnapshot } = require('../../core/config-snapshot');

module.exports = {
  name: 'bot',

  register({ bus, logger }) {
    bus.on('chat:mensaje-permitido', (payload) => {
      // El plan Free tambien usa !p: los limites (20 solicitudes/directo,
      // 5 en cola) se validan en sonido/musica/handle-request.js.
      if (!payload) return;
      // rawComment: el display de chat-guard cambia las URLs por "link".
      const parsed = parseCommand(payload.rawComment || payload.comment);
      if (!parsed) {
        const config = getConfigSnapshot(bus);
        if (config.debugLog) {
          logger.log(
            'debug', 'bot', 'bot/index.js#register', 'bot.comando.no_reconocido',
            `Mensaje de ${payload.user} no es un comando`, { platform: payload.platform, user: payload.user }
          );
        }
        return;
      }

      logger.log(
        'debug', 'bot', 'bot/index.js#register', 'bot.comando.detectado',
        `Comando ${parsed.comando} detectado de ${payload.user}`, { comando: parsed.comando, platform: payload.platform, user: payload.user }
      );

      // Se muta el mismo objeto que /chat todavia va a mandar por
      // ws:broadcast (este listener corre sincronico, antes de ese emit) —
      // el mensaje sigue visible en el chat, pero el front no lo lee por TTS.
      payload.ttsBlocked = true;

      bus.emit('bot:comando', {
        cmd: parsed.comando,
        args: parsed.args,
        platform: payload.platform,
        user: payload.user,
        userId: payload.userId,
        avatar: payload.avatar || '',
      });
    }, 'bot');

    return { rutas: 0, listeners: 1 };
  },
};
