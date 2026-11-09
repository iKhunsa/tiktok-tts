'use strict';

const { getAccountDeletionWebhookUrl, getCancellationWebhookUrl } = require('../webhook-url');
const { postIdeasWebhook } = require('../discord/post-webhook');

const APP_VERSION = require('../../../package.json').version;
const MOTIVOS_BAJA = {
  noUso: 'Ya no utilizo TikLiveTTS',
  tecnico: 'Tuve problemas técnicos',
  dificil: 'Me resultó difícil de usar',
  funciones: 'No encontré las funciones que necesitaba',
  alternativa: 'Encontré una alternativa mejor',
  otro: 'Otro motivo',
};
const MOTIVOS_CANCELACION = {
  precio: 'El precio es demasiado alto',
  pocoUso: 'No utilizo lo suficiente mi suscripción',
  valor: 'No obtuve el valor que esperaba',
  tecnico: 'Tuve problemas con las funciones Pro',
  funciones: 'Necesito funciones que no están disponibles',
  temporal: 'Solo necesitaba el servicio por un tiempo',
  otro: 'Otro motivo',
};

const trim = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// Mismo flujo para baja de cuenta y cancelación de plan: motivo obligatorio +
// comentario/email opcionales -> embed en un webhook de Discord.
function crearReporte({ motivos, titulo, evento, getUrl }) {
  return (logger, deps = {}) => {
    const getWebhookUrl = deps.getWebhookUrl || getUrl;
    const postWebhook = deps.postWebhook || postIdeasWebhook;
    return async (req, res) => {
      const motivo = Object.hasOwn(motivos, req.body?.motivo) ? motivos[req.body.motivo] : null;
      if (!motivo) return res.status(400).json({ error: 'Motivo inválido' });
      const webhookUrl = getWebhookUrl(logger);
      if (!webhookUrl) return res.status(503).json({ error: 'No disponible' });
      const comentario = trim(req.body?.comentario, 900);
      const email = trim(req.body?.email, 254);
      const fields = [{ name: 'Motivo', value: motivo }];
      if (comentario) fields.push({ name: 'Comentario', value: comentario });
      if (email) fields.push({ name: 'Email (quiere respuesta)', value: email });
      const embed = {
        title: titulo, color: 15158332, fields,
        footer: { text: `TikLiveTTS v${APP_VERSION}` }, timestamp: new Date().toISOString(),
      };
      try {
        await postWebhook(webhookUrl, embed, { threadName: `${titulo}: ${motivo}`.slice(0, 100) });
        logger.log('info', 'sugerencias', `sugerencias/routes/report-baja.js#${evento}`, `${evento}.enviada`, 'Feedback enviado', { motivo: req.body.motivo });
        return res.json({ ok: true });
      } catch (error) {
        logger.log('warn', 'sugerencias', `sugerencias/routes/report-baja.js#${evento}`, `${evento}.fallo`, `No se pudo enviar feedback: ${error.message}`, { error: error.message });
        return res.status(502).json({ error: 'No se pudo enviar' });
      }
    };
  };
}

const reportBaja = crearReporte({ motivos: MOTIVOS_BAJA, titulo: 'Baja de cuenta en TikLiveTTS', evento: 'baja', getUrl: getAccountDeletionWebhookUrl });
const reportCancelacion = crearReporte({ motivos: MOTIVOS_CANCELACION, titulo: 'Cancelación de suscripción', evento: 'cancelacion', getUrl: getCancellationWebhookUrl });

module.exports = { reportBaja, reportCancelacion, MOTIVOS_BAJA, MOTIVOS_CANCELACION };
