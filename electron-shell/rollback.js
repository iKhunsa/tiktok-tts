'use strict';

const { listarReleases, compararVersiones } = require('./github-releases');
const { descargarInstalador, ejecutarInstalador } = require('./instalar-version');

async function listarVersionesAnteriores(app) {
  const releases = await listarReleases();
  const actual = app.getVersion();
  return releases
    .filter((r) => compararVersiones(r.version, actual) < 0)
    .sort((a, b) => compararVersiones(b.version, a.version));
}

async function rollbackAVersion(app, version, onProgress) {
  const disponibles = await listarVersionesAnteriores(app);
  const objetivo = disponibles.find((r) => r.version === version);
  if (!objetivo) throw new Error('version_no_encontrada');

  const destino = await descargarInstalador(app, objetivo.asset, onProgress);
  ejecutarInstalador(destino);
  app.quit();
}

module.exports = { listarVersionesAnteriores, rollbackAVersion };
