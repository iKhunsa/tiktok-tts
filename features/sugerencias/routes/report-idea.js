'use strict';

const { getIdeasWebhookUrl } = require('../webhook-url');
const { postIdeasWebhook } = require('../discord/post-webhook');

const APP_VERSION = require('../../../package.json').version;
const MAX_INPUT = 2000;
// Se deja margen para nombres, título y pie: cuatro campos largos + discord/email nunca superan 6000.
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
    problema: trimText(body?.problema), idea: trimText(body?.idea),
    appSimilar: trimText(body?.appSimilar),
    discord: trimText(body?.discord, 40), email: trimText(body?.email, 254),
  };
  if (!idea.problema || !idea.idea) return { errorKey: 'errors.ideasRequired' };
  return { value: idea };
}
function buildEmbed(idea, { appVersion = 'unknown', language = 'es' } = {}) {
  const fields = [['Problema', idea.problema], ['Idea', idea.idea]];
  if (idea.appSimilar) fields.push(['App similar', idea.appSimilar]);
  if (idea.discord) fields.push(['Discord', idea.discord]);
  if (idea.email) fields.push(['Email', idea.email]);
  return {
    title: 'Nueva sugerencia para TikLiveTTS', color: 16766720,
    fields: fields.map(([name, value]) => ({ name: truncateEmbed(name, 256), value: truncateEmbed(value) })),
    footer: { text: truncateEmbed(`TikLiveTTS v${appVersion} · UI: ${language}`, 2048) }, timestamp: new Date().toISOString(),
  };
}
// Título del hilo si el canal de Discord es un foro (máx. 100 caracteres, una línea).
function buildThreadName(idea) { return `Idea: ${idea.idea}`.replace(/\s+/g, ' ').slice(0, 100); }
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
    const version = trimText(req.body?.appVersion, 30) || APP_VERSION;
    const language = trimText(req.body?.language, 12) || 'es';
    try {
      await postWebhook(webhookUrl, buildEmbed(checked.value, { appVersion: version, language }), { threadName: buildThreadName(checked.value) });
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
function markSent(time) { sentAt.push(time); }
function resetRateLimit() { sentAt = []; }

module.exports = { buildEmbed, buildThreadName, isRateLimited, markSent, reportIdea, resetRateLimit, trimText, truncateEmbed, validateIdea };
