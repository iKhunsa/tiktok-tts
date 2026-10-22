'use strict';

const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

// Volver a una version anterior instalada desde GitHub Releases — distinto de
// electron-shell/updater.js (ese solo sabe ir hacia adelante). Reusa el mismo
// instalador NSIS real que ya publica el release: como es perMachine:false, el
// codigo vive en %LOCALAPPDATA%\Programs\... y los datos del usuario en
// %APPDATA%\TikLiveTTS, asi que reinstalar una version vieja nunca los toca.

const REPO = 'iKhunsa/tiktok-tts'; // mismo owner/repo que package.json#build.publish

// Comparador semver simple (X.Y.Z[-pre]) — un solo consumidor (este archivo),
// no amerita la dependencia 'semver'.
function compararVersiones(a, b) {
  const [baseA, preA] = a.split('-');
  const [baseB, preB] = b.split('-');
  const partsA = baseA.split('.').map(Number);
  const partsB = baseB.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (partsA[i] || 0) - (partsB[i] || 0);
    if (diff !== 0) return diff < 0 ? -1 : 1;
  }
  if (preA && !preB) return -1; // una prerelease es "menor" que su estable
  if (!preA && preB) return 1;
  if (preA === preB) return 0;
  return preA < preB ? -1 : 1;
}

async function listarVersionesAnteriores(app) {
  const res = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=8`, {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) throw new Error(`GitHub releases ${res.status}`);
  const releases = await res.json();
  const actual = app.getVersion();

  return releases
    .filter((r) => !r.draft)
    .map((r) => ({
      version: r.tag_name.replace(/^v/, ''),
      publishedAt: r.published_at,
      prerelease: !!r.prerelease,
      asset: (r.assets || []).find((a) => a.name.endsWith('.exe')),
    }))
    .filter((r) => r.asset && compararVersiones(r.version, actual) < 0)
    .sort((a, b) => compararVersiones(b.version, a.version));
}

async function descargarAsset(asset, destino, onProgress) {
  const res = await fetch(asset.browser_download_url);
  if (!res.ok || !res.body) throw new Error(`descarga del instalador ${res.status}`);

  const total = Number(res.headers.get('content-length')) || asset.size || 0;
  let transferido = 0;
  const out = fs.createWriteStream(destino);

  for await (const chunk of res.body) {
    out.write(chunk);
    transferido += chunk.length;
    if (onProgress) onProgress({ transferido, total, percent: total ? Math.round((transferido / total) * 100) : 0 });
  }
  await new Promise((resolve, reject) => out.end((err) => (err ? reject(err) : resolve())));
}

async function rollbackAVersion(app, version, onProgress) {
  const disponibles = await listarVersionesAnteriores(app);
  const objetivo = disponibles.find((r) => r.version === version);
  if (!objetivo) throw new Error('version_no_encontrada');

  const destino = path.join(app.getPath('temp'), objetivo.asset.name);
  await descargarAsset(objetivo.asset, destino, onProgress);

  // Mismo instalador NSIS (oneClick:false) que usa el update hacia adelante —
  // se lanza y se deja al usuario confirmar el asistente, igual que siempre.
  execFile(destino, [], { detached: true }).unref();
  app.quit();
}

module.exports = { listarVersionesAnteriores, rollbackAVersion, compararVersiones };
