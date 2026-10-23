'use strict';

/**
 * Gate por donacion: reemplazo del viejo "solo seguidores" (ver CLAUDE.md,
 * eliminado porque TikTok/Kick/YouTube nunca exponen el estado real de
 * "sigue o no" para alguien que ya seguia antes de esta sesion). Acá en
 * cambio SI hay señal real y en vivo en las 3 plataformas que la soportan:
 * regalo de TikTok, cheer de Twitch (bits van en el mismo mensaje de chat),
 * evento `kicks.gifted` de Kick (llega por el WS de cuentas vinculadas).
 *
 * Una vez que un viewer paga el minimo configurado para su plataforma,
 * queda "calificado" el resto de la sesion actual (no hace falta pagar de
 * nuevo por cada mensaje) — mismo criterio que tenia el viejo seguidor:
 * una vez adentro, adentro. No persiste a disco: es puramente de la sesion
 * en curso, se resetea al cambiar de cuenta o reiniciar la app.
 */

const qualified = new Set(); // viewerKey

function reset() {
  qualified.clear();
}

function marcarCalificado(viewerKey) {
  qualified.add(viewerKey);
}

function estaCalificado(viewerKey) {
  return qualified.has(viewerKey);
}

/** true si el gate de esa plataforma esta prendido en la config actual. */
function gateActivo(config, platform) {
  if (platform === 'tiktok') return !!config.ttsGiftGateTiktokEnabled;
  if (platform === 'twitch') return !!config.ttsGiftGateTwitchEnabled;
  if (platform === 'kick') return !!config.ttsGiftGateKickEnabled;
  return false; // youtube: sin gate, fuera de alcance por ahora
}

module.exports = { reset, marcarCalificado, estaCalificado, gateActivo };
