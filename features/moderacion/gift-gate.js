'use strict';

/**
 * Gate por donacion: reemplazo del viejo "solo seguidores" (ver CLAUDE.md,
 * eliminado porque TikTok/Kick/YouTube nunca exponen el estado real de
 * "sigue o no" para alguien que ya seguia antes de esta sesion). Acá en
 * cambio SI hay señal real y en vivo: regalo de TikTok, cheer de Twitch
 * (bits van en el mismo mensaje de chat), evento `kicks.gifted` de Kick
 * (llega por el WS de cuentas vinculadas).
 *
 * Es un credito de UN SOLO mensaje, no un "queda habilitado el resto de la
 * sesion": pagar el minimo solo destraba el proximo mensaje que se evalue de
 * ese viewer (en Twitch, literalmente el mismo mensaje del cheer, porque
 * bits y texto llegan juntos). Si despues quiere que lo sigan leyendo, tiene
 * que volver a donar. Se consume al leerlo (otorgarCredito -> consumirCredito,
 * nunca una segunda vez). No persiste a disco: se resetea al cambiar de
 * cuenta o reiniciar la app.
 */

const creditos = new Set(); // viewerKey con un mensaje pendiente de leer

function reset() {
  creditos.clear();
}

function otorgarCredito(viewerKey) {
  creditos.add(viewerKey);
}

/** true una sola vez por credito: lo consume al preguntar. */
function consumirCredito(viewerKey) {
  if (!creditos.has(viewerKey)) return false;
  creditos.delete(viewerKey);
  return true;
}

/** true si el gate de esa plataforma esta prendido en la config actual. */
function gateActivo(config, platform) {
  if (platform === 'tiktok') return !!config.ttsGiftGateTiktokEnabled;
  if (platform === 'twitch') return !!config.ttsGiftGateTwitchEnabled;
  if (platform === 'kick') return !!config.ttsGiftGateKickEnabled;
  return false; // youtube: sin gate, fuera de alcance por ahora
}

module.exports = { reset, otorgarCredito, consumirCredito, gateActivo };
