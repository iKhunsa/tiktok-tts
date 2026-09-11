'use strict';

const { MOBILE_ALLOWED_ACTIONS } = require('../allowed-actions');
const { hasDesktopClient } = require('../has-desktop-client');

function esPayloadValido({ action, value, soundId, clipId, key, index }) {
  // value es booleano para toggle/globalTTS/pause, numero 0-1 para musicVolume.
  if (action === 'musicVolume') {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) return false;
  } else if (value !== undefined && typeof value !== 'boolean' && typeof value !== 'number') {
    return false;
  }
  if (soundId !== undefined && typeof soundId !== 'string') return false;
  if (clipId !== undefined && typeof clipId !== 'string') return false;
  if (key !== undefined && typeof key !== 'string') return false;
  if (index !== undefined && (!Number.isInteger(index) || index < 0)) return false;
  return true;
}

/**
 * Valida y re-emite el comando como movil:comando — /canales, /sonido,
 * /clips se suscriben cuando existan, /movil nunca llama funciones de otro
 * dominio directo. El broadcast 'remote-cmd' se preserva para compatibilidad
 * con el front actual (relay al cliente desktop via WS).
 */
function command(deps) {
  return (req, res) => {
    const { bus, logger, wss } = deps;
    const { action, key, value, index, clipId, soundId } = req.body || {};

    if (!action || !MOBILE_ALLOWED_ACTIONS.has(action)) {
      logger.log(
        'warn', 'movil', 'movil/routes/command.js#command', 'movil.comando.no_valido',
        `Comando movil no valido: ${action}`, { action }
      );
      return res.status(400).json({ error: 'Acción no válida' });
    }

    if (!esPayloadValido(req.body || {})) {
      logger.log(
        'warn', 'movil', 'movil/routes/command.js#command', 'movil.comando.payload_invalido',
        `Payload invalido para comando movil: ${action}`, { action }
      );
      return res.status(400).json({ error: 'Datos del comando inválidos' });
    }

    bus.emit('movil:comando', { action, key, value, index, clipId, soundId });
    logger.log(
      'info', 'movil', 'movil/routes/command.js#command', 'movil.comando.recibido',
      `Comando movil recibido: ${action}`, { action }
    );

    // markClip ya lo resuelve /clips (Fase 11) server-side via movil:comando
    // -> clips:marcar -> el contrato de OBS. Relayarlo tambien al desktop
    // como remote-cmd disparia el guardado de replay dos veces.
    if (action === 'markClip') {
      return res.json({ ok: true });
    }

    if (!hasDesktopClient(wss)) {
      logger.log(
        'warn', 'movil', 'movil/routes/command.js#command', 'movil.comando.sin_desktop',
        `Comando ${action} sin cliente desktop conectado`, { action }
      );
      return res.json({ ok: false, reason: 'desktop-offline' });
    }

    bus.emit('ws:broadcast', { type: 'remote-cmd', action, key, value, index, clipId, soundId });
    res.json({ ok: true });
  };
}

module.exports = { command };
