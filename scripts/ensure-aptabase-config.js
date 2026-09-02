// Corre antes de electron-builder (npm run build:electron). Si CI ya escribio
// aptabase-config.generated.json desde el secret APTABASE_APP_KEY, no hace
// nada. Si no existe (build local sin ese secret), crea un placeholder para
// que electron-builder no falle por "from" inexistente — el build resultante
// simplemente sale sin analytics configurado.
'use strict';
const fs = require('fs');
const path = require('path');

const HOST_DEFECTO = 'https://aptabase.tiklivetts.es';
const target = path.join(__dirname, '..', 'aptabase-config.generated.json');

if (!fs.existsSync(target)) {
  const appKey = (process.env.APTABASE_APP_KEY || '').trim() || null;
  const host = (process.env.APTABASE_HOST || '').trim() || HOST_DEFECTO;
  fs.writeFileSync(target, JSON.stringify({ appKey, host }, null, 2));
  console.log(
    appKey
      ? '[prebuild] aptabase-config.generated.json creado desde APTABASE_APP_KEY.'
      : '[prebuild] aptabase-config.generated.json no existía, se creó sin appKey (analytics desactivado).'
  );
}
