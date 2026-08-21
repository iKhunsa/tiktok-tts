// Corre antes de electron-builder (npm run build:electron). Si CI ya escribio
// telemetry-config.generated.json desde los secrets TELEMETRY_URL/INGEST_TOKEN,
// no hace nada. Si no existe (build local sin esos secrets), crea un
// placeholder vacio para que electron-builder no falle por "from" inexistente
// — el build resultante simplemente sale sin telemetria configurada.
'use strict';
const fs = require('fs');
const path = require('path');

const target = path.join(__dirname, '..', 'telemetry-config.generated.json');
if (!fs.existsSync(target)) {
  fs.writeFileSync(target, JSON.stringify({ url: null, token: null }, null, 2));
  console.log('[prebuild] telemetry-config.generated.json no existía, se creó vacío (sin telemetría configurada).');
}
