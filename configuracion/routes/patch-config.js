'use strict';

function patchConfig(configStore, bus, logger) {
  return (req, res) => {
    const { rejected, changed, keysChanged } = configStore.applyPatch(req.body || {});

    if (rejected.length) {
      logger.log(
        'warn', 'configuracion', 'configuracion/routes/patch-config.js#patchConfig', 'configuracion.patch.rechazado',
        `PATCH /api/config rechazo ${rejected.length} clave(s) invalida(s)`, { rejected }
      );
      return res.status(400).json({ error: 'Config invalida', errorKey: 'errors.invalidConfig', rejected, config: configStore.config });
    }

    if (changed) {
      configStore.save();
      // Nunca los valores, solo que claves cambiaron (regla dura #5).
      logger.log(
        'info', 'configuracion', 'configuracion/routes/patch-config.js#patchConfig', 'configuracion.patch.aplicado',
        `PATCH /api/config aplico ${keysChanged.length} cambio(s)`, { keysChanged }
      );
      bus.emit('config:actualizado', { keysChanged });
      bus.emit('ws:broadcast', { type: 'config-updated', config: configStore.config });
    }

    res.json(configStore.config);
  };
}

module.exports = { patchConfig };
