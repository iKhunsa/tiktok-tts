'use strict';

const { getIdeasWebhookUrl } = require('../webhook-url');
const { postIdeasWebhook } = require('../discord/post-webhook');

const AUDIENCES = new Set(['casi-todos', 'muchos', 'algunos', 'como-yo', 'no-seguro']);
const MAX_INPUT = 2000;
// Se deja margen para nombres, título y pie: seis campos nunca superan 6000.
const MAX_EMBED_VALUE = 900;
const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
let sentAt = [];

function trimText(value, max = MAX_INPUT) { return typeof value === 'string' ? value.trim().slice(0, max) : ''; }
function truncateEmbed(value, max = MAX_EMBED_VALUE) {
  const text = String(value || '');
  return text.length > max ? `${text.slice(0, max - 3)}...` : text;
}
function validateIdea(body) {
  const idea = {
    problema: trimText(body?.problema), idea: trimText(body?.idea), audiencia: trimText(body?.audiencia, 30),
    casoUso: trimText(body?.casoUso), motivo: trimText(body?.motivo), appSimilar: trimText(body?.appSimilar),
  };
  if (!idea.problema || !idea.idea || !idea.audiencia || !idea.casoUso || !idea.motivo) return { errorKey: 'errors.ideasRequired' };
  if (!AUDIENCES.has(idea.audiencia)) return { errorKey: 'errors.ideasInvalidAudience' };
  return { value: idea };
}
function buildEmbed(idea, { appVersion = 'unknown', language = 'es' } = {}) {
  const fields = [['Problema', idea.problema], ['Idea', idea.idea], ['Audiencia', idea.audiencia], ['Caso de uso', idea.casoUso], ['Por qué vale la pena', idea.motivo]];
  if (idea.appSimilar) fields.push(['App similar', idea.appSimilar]);
  return {
    title: 'Nueva sugerencia para TikLiveTTS', color: 16766720,
    fields: fields.map(([name, value]) => ({ name: truncateEmbed(name, 256), value: truncateEmbed(value) })),
    footer: { text: truncateEmbed(`TikLiveTTS v${appVersion} · UI: ${language}`, 2048) }, timestamp: new Date().toISOString(),
  };
}
function isRateLimited(now) {
  sentAt = sentAt.filter((time) => now - time < HOUR);
  return sentAt.some((time) => now - time < MINUTE) || sentAt.length >= 5;
}
function reportIdea(logger, bus, deps = {}) {
  const now = deps.now || Date.now;
  const getWebhookUrl = deps.getWebhookUrl || getIdeasWebhookUrl;
  const postWebhook = deps.postWebhook || postIdeasWebhook;
  return async (req, res) => {
    const checked = validateIdea(req.body);
    if (checked.errorKey) return res.status(400).json({ error: 'Datos de sugerencia inválidos', errorKey: checked.errorKey });
    const current = now();
    if (isRateLimited(current)) return res.status(429).json({ error: 'Esperá antes de enviar otra sugerencia', errorKey: 'errors.ideasRateLimited' });
    const webhookUrl = getWebhookUrl(logger);
    if (!webhookUrl) return res.status(503).json({ error: 'Sugerencias no disponibles temporalmente', errorKey: 'errors.ideasUnavailable' });
    const version = trimText(req.body?.appVersion, 30) || 'unknown';
    const language = trimText(req.body?.language, 12) || 'es';
    try {
      await postWebhook(webhookUrl, buildEmbed(checked.value, { appVersion: version, language }));
      sentAt.push(current);
      logger.log('info', 'sugerencias', 'sugerencias/routes/report-idea.js#reportIdea', 'ideas.enviada', 'Sugerencia enviada a Discord', { version, language });
      if (bus) bus.emit('ideas:enviada');
      return res.json({ ok: true });
    } catch (error) {
      logger.log('warn', 'sugerencias', 'sugerencias/routes/report-idea.js#reportIdea', 'ideas.fallo', `No se pudo enviar sugerencia: ${error.message}`, { error: error.message });
      return res.status(502).json({ error: 'No se pudo enviar la sugerencia', errorKey: 'errors.ideasSendFailed' });
    }
  };
}
function resetRateLimit() { sentAt = []; }

module.exports = { AUDIENCES, buildEmbed, reportIdea, resetRateLimit, truncateEmbed, validateIdea };
