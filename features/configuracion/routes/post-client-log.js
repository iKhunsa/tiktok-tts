'use strict';

/**
 * Errores capturados en el cliente (renderer) — se suman al log de sesion.
 */
function postClientLog(logger) {
  return (req, res) => {
    const { message, stack, source, recientes } = req.body || {};
    if (!message) return res.status(400).json({ error: 'message requerido' });
    const data = { source };
    if (stack) data.stack = String(stack).slice(0, 4000);
    // `recientes` = ultimos logs locales de la UI (LogStorage). Los usa
    // electron-shell/glitchtip.js como breadcrumbs del issue del renderer.
    if (Array.isArray(recientes) && recientes.length) {
      data.recientes = recientes.slice(-25).map((r) => ({
        ts: typeof r === 'object' && r ? r.timestamp : undefined,
        level: typeof r === 'object' && r ? r.level : undefined,
        source: typeof r === 'object' && r ? r.source : undefined,
        message: String((typeof r === 'object' && r ? r.message : r) || '').slice(0, 300),
      }));
    }
    logger.log(
      'error', 'configuracion', 'configuracion/routes/post-client-log.js#postClientLog', 'configuracion.log_cliente.recibido',
      String(message).slice(0, 2000), data
    );
    res.json({ ok: true });
  };
}

module.exports = { postClientLog };
