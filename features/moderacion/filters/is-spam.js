'use strict';

const { moderationStage } = require('./moderation-stage');
const { normalizeAggressive } = require('./normalize-aggressive');
const { isDuplicateRecent } = require('./is-duplicate-recent');

const DUP_MIN_LEN = 4; // mensajes cortos (ok, no, ja) quedan exentos del check

const STAGE_MOTIVO = {
  length: 'longitud',
  repeatedChar: 'char-repetido',
  blockedWord: 'palabra-bloqueada',
  script: 'script',
  dict: 'dict',
};

/** motivo: {platform, userId, nick, key} — se loguea SIEMPRE con identidad completa. */
function logMensajeBloqueado(logger, ident, motivo) {
  logger.log(
    'info', 'moderacion', 'moderacion/filters/is-spam.js#isSpam', 'moderacion.filtro.mensaje_bloqueado',
    `Mensaje bloqueado de ${ident.nick} (${ident.platform}): ${motivo}`,
    { platform: ident.platform, userId: ident.userId, nick: ident.nick, key: ident.key, motivo }
  );
}

function isSpam(logger, text, userKey, ident, blockedMatchersState, idiomaOpts, dupState) {
  const stage = moderationStage(text, blockedMatchersState, idiomaOpts);
  if (stage) {
    logMensajeBloqueado(logger, ident, STAGE_MOTIVO[stage.stage] || stage.stage);
    if (stage.stage === 'blockedWord') {
      logger.log(
        'info', 'moderacion', 'moderacion/filters/is-spam.js#isSpam', 'moderacion.filtro.palabra_bloqueada',
        `Palabra bloqueada detectada de ${ident.nick} (${ident.platform})`,
        { platform: ident.platform, userId: ident.userId, nick: ident.nick }
      );
    }
    return true;
  }

  const norm = normalizeAggressive(text);
  if (norm.length >= DUP_MIN_LEN && isDuplicateRecent(dupState, userKey, norm)) {
    logMensajeBloqueado(logger, ident, 'duplicado');
    return true;
  }

  return false;
}

module.exports = { isSpam, logMensajeBloqueado };
