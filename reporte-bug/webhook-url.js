'use strict';

const fs = require('fs');
const path = require('path');
const { RESOURCE_BASE, DATA_BASE } = require('../core/paths');

// Se busca primero en DATA_BASE (override local/dev, gitignored) y luego en
// RESOURCE_BASE (empaquetado via extraResources, o raiz del repo en dev).
const WEBHOOK_CONFIG_CANDIDATES = [
  path.join(DATA_BASE, 'webhook-config.json'),
  path.join(RESOURCE_BASE, 'webhook-config.json'),
];

/**
 * Migracion de getBugReportWebhookUrl (backend-viejo/server.js:177), pero
 * distingue el motivo exacto cuando no hay URL disponible en ningun
 * candidato: archivo-inexistente | json-corrupto | url-vacia.
 */
function getBugReportWebhookUrl(logger) {
  let motivo = 'archivo-inexistente';

  for (const candidate of WEBHOOK_CONFIG_CANDIDATES) {
    if (!fs.existsSync(candidate)) continue;

    let cfg;
    try {
      cfg = JSON.parse(fs.readFileSync(candidate, 'utf8'));
    } catch (_error) {
      motivo = 'json-corrupto';
      continue;
    }

    if (cfg && cfg.discordWebhookUrl) return cfg.discordWebhookUrl;
    motivo = 'url-vacia';
  }

  logger.log(
    'warn', 'reporte-bug', 'reporte-bug/webhook-url.js#getBugReportWebhookUrl', 'reporte_bug.webhook.no_configurado',
    `Webhook de Discord no configurado (motivo: ${motivo})`, { motivo }
  );
  return null;
}

module.exports = { getBugReportWebhookUrl };
