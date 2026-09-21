'use strict';

const fs = require('fs');
const path = require('path');
const { RESOURCE_BASE, DATA_BASE } = require('./paths');

const CANDIDATES = [
  path.join(DATA_BASE, 'webhook-config.json'),
  path.join(RESOURCE_BASE, 'webhook-config.json'),
];

function getWebhookConfigValue(key) {
  let reason = 'archivo-inexistente';
  for (const candidate of CANDIDATES) {
    if (!fs.existsSync(candidate)) continue;
    try {
      const config = JSON.parse(fs.readFileSync(candidate, 'utf8'));
      if (config && typeof config[key] === 'string' && config[key].trim()) return { value: config[key].trim() };
      reason = 'url-vacia';
    } catch {
      reason = 'json-corrupto';
    }
  }
  return { value: null, reason };
}

module.exports = { getWebhookConfigValue };
