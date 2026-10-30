'use strict';

const { getWebhookConfigValue } = require('../../core/webhook-config');

function getIdeasWebhookUrl(logger) {
  const result = getWebhookConfigValue('discordIdeasWebhookUrl');
  if (result.value) return result.value;
  logger.log('warn', 'sugerencias', 'sugerencias/webhook-url.js#getIdeasWebhookUrl', 'ideas.webhook.no_configurado', `Webhook de ideas no configurado (motivo: ${result.reason})`, { motivo: result.reason });
  return null;
}

function getOverlayIdeasWebhookUrl(logger) {
  const result = getWebhookConfigValue('discordOverlayIdeasWebhookUrl');
  if (result.value) return result.value;
  logger.log('warn', 'sugerencias', 'sugerencias/webhook-url.js#getOverlayIdeasWebhookUrl', 'ideas.overlay_webhook.no_configurado', `Webhook de ideas de overlay no configurado (motivo: ${result.reason})`, { motivo: result.reason });
  return null;
}

module.exports = { getIdeasWebhookUrl, getOverlayIdeasWebhookUrl };
