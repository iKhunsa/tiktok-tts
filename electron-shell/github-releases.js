'use strict';

// Lista los releases reales de GitHub y los clasifica por tag de version —
// compartido por electron-shell/updater.js (elegir la mas nueva segun el rol
// de la cuenta) y electron-shell/rollback.js (listar versiones anteriores).
// A proposito NO se usa el mecanismo de "canales" (latest.yml/beta.yml/...)
// de electron-updater: ese solo deja mirar UN canal fijo a la vez, y acá
// necesitamos que el rol "admin" vea estable+beta+alpha sumados, no uno solo.

const REPO = 'iKhunsa/tiktok-tts'; // mismo owner/repo que package.json#build.publish

// Comparador semver simple (X.Y.Z[-tag.N]) — una estable siempre es mas
// nueva que cualquier prerelease de su mismo X.Y.Z.
function compararVersiones(a, b) {
  const [baseA, preA] = a.split('-');
  const [baseB, preB] = b.split('-');
  const partsA = baseA.split('.').map(Number);
  const partsB = baseB.split('.').map(Number);
  for (let i = 0; i < 3; i++) {
    const diff = (partsA[i] || 0) - (partsB[i] || 0);
    if (diff !== 0) return diff < 0 ? -1 : 1;
  }
  if (preA && !preB) return -1;
  if (!preA && preB) return 1;
  if (preA === preB) return 0;
  return preA < preB ? -1 : 1;
}

// 'beta' | 'alpha' | null (estable), segun el sufijo propio del tag —
// "1.6.0-beta.1" -> 'beta'. Lo decide el tag en si, no un archivo de canal.
function tagDe(version) {
  const m = /^\d+\.\d+\.\d+-([a-z]+)/i.exec(version);
  return m ? m[1].toLowerCase() : null;
}

async function listarReleases() {
  const res = await fetch(`https://api.github.com/repos/${REPO}/releases?per_page=20`, {
    headers: { Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) throw new Error(`GitHub releases ${res.status}`);
  const releases = await res.json();

  return releases
    .filter((r) => !r.draft)
    .map((r) => {
      const version = r.tag_name.replace(/^v/, '');
      return {
        version,
        publishedAt: r.published_at,
        tag: tagDe(version),
        asset: (r.assets || []).find((a) => a.name.endsWith('.exe')),
      };
    })
    .filter((r) => r.asset);
}

module.exports = { REPO, listarReleases, compararVersiones, tagDe };
