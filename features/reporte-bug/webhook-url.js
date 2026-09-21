'use strict';

const { getWebhookConfigValue } = require('../../core/webhook-config');

/**
 * Migracion de getBugReportWebhookUrl (backend-viejo/server.js:177), pero
 * distingue el motivo exacto cuando no hay URL disponible en ningun
 * candidato: archivo-inexistente | json-corrupto | url-vacia.
 */
function getBugReportWebhookUrl(logger) {
  const result = getWebhookConfigValue('discordWebhookUrl');
  if (result.value) return result.value;

  logger.log(
    'warn', 'reporte-bug', 'reporte-bug/webhook-url.js#getBugReportWebhookUrl', 'reporte_bug.webhook.no_configurado',
    `Webhook de Discord no configurado (motivo: ${result.reason})`, { motivo: result.reason }
  );
  return null;
}

module.exports = { getBugReportWebhookUrl };
