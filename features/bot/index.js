'use strict';

const { parseCommand } = require('./parse-command');
const { FEATURES } = require('../avanzado');

function getConfigSnapshot(bus) {
  let snapshot = null;
  bus.emit('config:get', (config) => { snapshot = config; });
  return snapshot || {};
}

module.exports = {
  name: 'bot',

  register({ bus, logger }) {
    bus.on('chat:mensaje-permitido', (payload) => {
      if (!payload || !FEATURES.musicBot) return;
      const parsed = parseCommand(payload.comment);

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
      });
    }, 'bot');

    return { rutas: 0, listeners: 1 };
  },
};
