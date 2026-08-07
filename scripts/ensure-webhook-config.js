// Corre antes de electron-builder (npm run build:electron). Si CI ya escribió
// webhook-config.generated.json desde el secret DISCORD_BUG_REPORT_WEBHOOK, no
// hace nada. Si no existe (build local sin el secret), crea un placeholder
// vacío para que electron-builder no falle por "from" inexistente — el build
// resultante simplemente no tendrá reporte de bugs funcional.
'use strict';
const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'webhook-config.generated.json');
if (!fs.existsSync(target)) {
  fs.writeFileSync(target, JSON.stringify({ discordWebhookUrl: null }, null, 2));
  console.log('[prebuild] webhook-config.generated.json no existía, se creó vacío (sin webhook configurado).');
}
