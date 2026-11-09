'use strict';

/**
 * Contrato "¿este canal sigue transmitiendo?" para las plataformas cuyo chat
 * sigue conectado aunque el directo ya haya terminado (Twitch, Kick, YouTube).
 * /auth publica `twitchEnVivo` (Twitch exige credenciales de app que solo
 * tiene servicio-cuentas); /canales lo consume (canales/live-status/).
 *
 * Devuelve true (en vivo) | false (offline confirmado) | null (no se pudo
 * saber). Por defecto, sin servicio de cuentas configurado: siempre null.
 * Analogo a obs-replay.js (propiedad que el dominio dueño reemplaza).
 */
module.exports = {
  twitchEnVivo: async () => null,
};
