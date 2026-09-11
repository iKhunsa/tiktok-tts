'use strict';

const { isSpam, logMensajeBloqueado } = require('./filters/is-spam');

function getConfigSnapshot(bus) {
  let snapshot = null;
  bus.emit('config:get', (config) => { snapshot = config; });
  return snapshot || {};
}

/**
 * Implementa la interfaz de core/contracts/moderacion-policy.js. `text` debe
 * llegar ya pasado por normalizeForModeration (responsabilidad de /chat,
 * Fase 7 — mismo contrato que isSpam() en el backend viejo). Envuelto en su
 * propio try/catch (aparte del error-boundary generico de /core): si algo
 * lanza, retorna fail-open y emite moderacion.policy.fallo_evaluacion —
 * unica forma de saber que el fail-open se activo.
 */
function createPolicy({ store, logger, bus, blockedMatchersState, dupState }) {
  function evaluate(msg) {
    const { platform, userId, nick, text } = msg || {};
    try {
      const key = store.keyFor(platform, userId, nick);
      const eff = store.getEffective(key);
      const ident = { platform, userId, nick, key };
      const isFollower = eff.isFollower || eff.isWhitelisted;

      if (eff.isBanned) {
        logMensajeBloqueado(logger, ident, 'user-banned');
        return { isSpam: false, isMuted: eff.isMuted, isBanned: true, isFollower };
      }

      const config = getConfigSnapshot(bus);
      const idiomaOpts = {
        voiceId: config.ttsVoiceLang,
        langFilterEnabled: !!config.langFilterEnabled,
        dictFilterEnabled: !!config.dictFilterEnabled,
        allowedExtraLangs: config.allowedExtraLangs || [],
      };

      const spam = isSpam(logger, text, key, ident, blockedMatchersState, idiomaOpts, dupState);

      if (eff.isMuted && !spam) {
        logMensajeBloqueado(logger, ident, 'user-muted');
      }

      return { isSpam: spam, isMuted: eff.isMuted, isBanned: false, isFollower };
    } catch (error) {
      logger.log(
        'error', 'moderacion', 'moderacion/policy.js#evaluate', 'moderacion.policy.fallo_evaluacion',
        `Fallo evaluando moderacion, fail-open (mensaje tratado como permitido): ${error.message}`,
        { error: error.message, stack: error.stack }
      );
      return { isSpam: false, isMuted: false, isBanned: false, isFollower: false };
    }
  }

  return { evaluate };
}

module.exports = { createPolicy };
