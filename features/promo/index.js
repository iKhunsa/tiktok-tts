'use strict';

const { createSessionScheduler } = require('./session-scheduler');
const { PROMO_ANNOUNCE_TEXT, pickAnnounceText } = require('../../core/announce-texts');
const entitlements = require('../../core/contracts/entitlements');
const { getConfigSnapshot } = require('../../core/config-snapshot');

let scheduler = null;
let stopGraceTimer = null;

// ponytail: 5 min. Una reconexion transitoria (TikTok agota reintentos y el
// streamer vuelve a conectar, o una caida total breve) NO cuenta como sesion
// de vivo nueva: si los canales vuelven dentro de esta ventana, el scheduler
// sigue con su stepIndex y su tiempo transcurrido intactos en vez de reiniciar
// [15, 45, 60]. Subir si sesiones cortas legitimas empiezan a heredar el
// schedule de la sesion anterior.
const STOP_GRACE_MS = 5 * 60 * 1000;

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
      logger,
      onMilestone: () => {
        const config = getConfigSnapshot(bus);
        // Gate invertido: en Pro (entitlement 'sin-promos') los avisos NO suenan.
        // entitlements.check() default-abre TODO cuando subscriptionsEnabled=false
        // (para las features Pro normales), lo cual seria incorrecto acá porque
        // 'sin-promos' es negativo — por eso solo se evalua con suscripciones
        // activas; sin ellas, los avisos SIEMPRE suenan.
        if (config.subscriptionsEnabled && entitlements.check('sin-promos')) {
          logger.log('info', 'promo', 'promo/index.js#register', 'promo.autopromocion.omitida',
            'Aviso de autopromocion omitido (plan Pro sin anuncios)', {});
          return;
        }
        // `text` = fallback para clientes viejos; `texts` = mapa completo, el
        // cliente elige contra su voz TTS real (ver chat/emit-chat-message.js).
        const text = pickAnnounceText(PROMO_ANNOUNCE_TEXT, config && config.ttsVoiceLang);
        bus.emit('ws:broadcast', { type: 'promo-announce', text, texts: PROMO_ANNOUNCE_TEXT, timestamp: Date.now() });
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
      if (total > 0) {
        // Volvieron los canales: cancelar cualquier stop() en gracia. Si el
        // scheduler seguia corriendo, startIfNeeded() es no-op (misma sesion).
        if (stopGraceTimer) { clearTimeout(stopGraceTimer); stopGraceTimer = null; }
        scheduler.startIfNeeded();
      } else if (!stopGraceTimer) {
        // Deliberado: un canal que flappea (baja a 0 y vuelve dentro de la ventana)
        // re-arma esta gracia indefinidamente y mantiene viva la sesion de promo —
        // flappear no es un fin de directo. Sin cap ni contador a proposito.
        // Bajamos a 0 canales: no cortar el scheduler de una — dar STOP_GRACE_MS
        // por si es una reconexion. Recien si la ventana se cumple, stop() real
        // (resetea stepIndex -> proxima sesion arranca en [15, 45, 60]).
        stopGraceTimer = setTimeout(() => {
          stopGraceTimer = null;
          scheduler.stop();
        }, STOP_GRACE_MS);
        if (stopGraceTimer.unref) stopGraceTimer.unref();
      }
    }, 'promo');

    return { rutas: 0, listeners: 1 };
  },

  shutdown() {
    if (stopGraceTimer) { clearTimeout(stopGraceTimer); stopGraceTimer = null; }
    if (scheduler) scheduler.stop();
  },
};
