'use strict';

const { createSessionScheduler } = require('./session-scheduler');

const PROMO_ANNOUNCE_TEXT = '¿Haces stream y quieres una voz que lea el chat? Descarga TikLive TTS: tu live también puede sonar así.';

let scheduler = null;

/**
 * Autopromocion por tiempo de sesion — misma inspiracion que el aviso de
 * "el creador acaba de ingresar" (chat/emit-chat-message.js), pero disparada
 * por un timer de sesion en vez de por un mensaje de chat con identidad
 * admin. El timer arranca solo cuando el conteo total de canales conectados
 * (las 4 plataformas) pasa de 0 a >0, y se corta cuando vuelve a 0 — asi una
 * desconexion + reconexion cuenta como sesion de vivo nueva.
 */
module.exports = {
  name: 'promo',

  register({ bus, logger }) {
    scheduler = createSessionScheduler({
      onMilestone: () => {
        bus.emit('ws:broadcast', { type: 'promo-announce', text: PROMO_ANNOUNCE_TEXT, timestamp: Date.now() });
        logger.log(
          'info', 'promo', 'promo/index.js#register', 'promo.autopromocion.disparada',
          'Alerta de autopromocion por tiempo de sesion disparada', {}
        );
      },
    });

    // canal:estado con state:'lista-canales' (emitido por
    // canales/broadcast-channels.js tras CADA connect/disconnect) es el
    // unico evento que trae el conteo de las 4 plataformas a la vez — mejor
    // fuente que escuchar 'conectado'/'desconectado' por canal y sumar a mano.
    bus.on('canal:estado', (payload) => {
      if (!payload || payload.state !== 'lista-canales') return;
      const total = ['tiktok', 'twitch', 'youtube', 'kick']
        .reduce((sum, p) => sum + (Array.isArray(payload[p]) ? payload[p].length : 0), 0);
      if (total > 0) scheduler.startIfNeeded();
      else scheduler.stop();
    }, 'promo');

    return { rutas: 0, listeners: 1 };
  },

  shutdown() {
    if (scheduler) scheduler.stop();
  },
};
