// Corre antes de electron-builder (prebuild:electron). Para cada config
// bakeable: si CI ya la escribió desde su secret, no toca nada; si no existe
// (build local sin secrets), crea un placeholder para que electron-builder no
// falle por "from" inexistente — el build sale con esa integración desactivada.
'use strict';
const fs = require('fs');
const path = require('path');

const CONFIGS = [
  { file: 'webhook-config.generated.json', data: () => ({ discordWebhookUrl: null }) },
  { file: 'telemetry-config.generated.json', data: () => ({ url: null, token: null }) },
  {
    file: 'aptabase-config.generated.json',
    data: () => ({
      appKey: (process.env.APTABASE_APP_KEY || '').trim() || null,
      host: (process.env.APTABASE_HOST || '').trim() || 'https://aptabase.tiklivetts.es',
    }),
  },
];

for (const { file, data } of CONFIGS) {
  const target = path.join(__dirname, '..', file);
  if (fs.existsSync(target)) continue;
  fs.writeFileSync(target, `${JSON.stringify(data(), null, 2)}\n`);
  console.log(`[prebuild] ${file} no existía, creado vacío (integración desactivada).`);
}
