'use strict';

const { personasDistintas } = require('./activity-window');
const { totalViewers } = require('./viewers-snapshot');

const MIN_VIEWERS = 5;   // se necesita MAS de esto (viewerCount de TikTok)
const MIN_PERSONAS = 5;  // personas distintas escribiendo en los ultimos 5 min

/**
 * Cualquiera de las dos senales basta: el viewerCount solo ve TikTok, asi que
 * un streamer con la audiencia en Twitch/YouTube lo cubre el conteo de chat.
 * viewerCount 0 o ausente cuenta como "no cumple" y se cae al chat.
 */
function hayAudiencia() {
  const viewers = totalViewers();
  const personas = personasDistintas();
  return { ok: viewers > MIN_VIEWERS || personas >= MIN_PERSONAS, viewers, personas };
}

module.exports = { hayAudiencia, MIN_VIEWERS, MIN_PERSONAS };
