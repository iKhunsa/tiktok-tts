'use strict';

const { MOBILE_ALLOWED_ACTIONS } = require('../allowed-actions');
const { hasDesktopClient } = require('../has-desktop-client');

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

    bus.emit('movil:comando', { action, key, value, index, clipId, soundId });
    logger.log(
      'info', 'movil', 'movil/routes/command.js#command', 'movil.comando.recibido',
      `Comando movil recibido: ${action}`, { action }
    );

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
