'use strict';

// Tipos que el boton Test de un overlay puede difundir. Lista cerrada: la ruta
// no reenvia cualquier cosa que llegue por HTTP a todos los overlays.
// gift/follow/share tienen sus rutas propias (actualizan el estado del servidor).
const TIPOS_PERMITIDOS = new Set(['gift', 'superchat', 'join', 'stream-end', 'music-test']);
const CLAVES_PERMITIDAS = ['type', 'kind', 'platform', 'user', 'amount', 'color', 'sticker', 'renovacion'];

/** Difunde un evento de muestra (el que define cada alerta en el cliente) solo a los overlays. */
function testEvento(deps) {
  return (req, res) => {
    const { bus, logger } = deps;
    const evento = (req.body && req.body.evento) || {};
    if (!TIPOS_PERMITIDOS.has(evento.type)) {
      return res.status(400).json({ error: 'Tipo de evento no permitido', errorKey: 'toast.testError' });
    }
    const limpio = Object.fromEntries(CLAVES_PERMITIDAS.filter((clave) => evento[clave] !== undefined).map((clave) => [clave, evento[clave]]));
    bus.emit('ws:broadcast', { ...limpio, timestamp: Date.now(), test: true });
    logger.log('info', 'overlay', 'overlay/routes/test-evento.js#testEvento', 'overlay.test.disparado', 'Test de evento disparado', { tipo: evento.type, payload: { kind: limpio.kind || null } });
    res.json({ success: true, type: evento.type });
  };
}

module.exports = { testEvento };
