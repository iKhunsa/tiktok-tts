'use strict';

/**
 * Errores capturados en el cliente (renderer) — se suman al log de sesion.
 */
function postClientLog(logger) {
  return (req, res) => {
    const { message, stack, source } = req.body || {};
    if (!message) return res.status(400).json({ error: 'message requerido' });
    logger.log(
      'error', 'configuracion', 'configuracion/routes/post-client-log.js#postClientLog', 'configuracion.log_cliente.recibido',
      String(message).slice(0, 2000),
      stack ? { stack: String(stack).slice(0, 4000), source } : { source }
    );
    res.json({ ok: true });
  };
}

module.exports = { postClientLog };
