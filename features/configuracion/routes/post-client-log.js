'use strict';

// Ruido del navegador que no es un bug de la app: ResizeObserver avisa de un loop benigno y
// "Script error." es un error de otro origen (iframe .epik sandboxed) sin stack ni informacion util.
const RUIDO_NAVEGADOR = /^(ResizeObserver loop|Script error\.?$)/i;

// Eventos con nombre propio que emite reportarFallo (interfaz/compartido/reportar-fallo.js).
const EVENTO_INTERFAZ = /^interfaz\.(overlay|categorias|explorador|editor)\.[a-z0-9_]{3,50}$/;

// `detalle` solo admite valores planos y cortos: nada de objetos anidados ni texto libre largo.
function limpiarDetalle(detalle) {
  const out = {};
  if (!detalle || typeof detalle !== 'object') return out;
  for (const [k, v] of Object.entries(detalle).slice(0, 12)) {
    if (typeof v === 'string') out[k] = v.slice(0, 200);
    else if (typeof v === 'number' || typeof v === 'boolean') out[k] = v;
  }
  return out;
}

/**
 * Errores capturados en el cliente (renderer) — se suman al log de sesion.
 */
function postClientLog(logger) {
  return (req, res) => {
    const { message, stack, source, recientes, evento, nivel, detalle } = req.body || {};
    if (!message) return res.status(400).json({ error: 'message requerido' });
    if (RUIDO_NAVEGADOR.test(String(message))) return res.json({ ok: true, ignorado: true });
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
    const esEventoInterfaz = typeof evento === 'string' && EVENTO_INTERFAZ.test(evento);
    if (esEventoInterfaz) {
      Object.assign(data, limpiarDetalle(detalle));
      logger.log(
        nivel === 'warn' ? 'warn' : 'error', 'interfaz', 'configuracion/routes/post-client-log.js#postClientLog', evento,
        String(message).slice(0, 500), data
      );
      return res.json({ ok: true });
    }
    logger.log(
      'error', 'configuracion', 'configuracion/routes/post-client-log.js#postClientLog', 'configuracion.log_cliente.recibido',
      String(message).slice(0, 2000), data
    );
    res.json({ ok: true });
  };
}

module.exports = { postClientLog };
