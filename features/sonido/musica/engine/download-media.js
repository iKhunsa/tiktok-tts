'use strict';

const fs = require('fs');
const path = require('path');
const { ensureReady } = require('./ensure-ready');
const { runYtdlp } = require('./run-ytdlp');
const { commonArgs } = require('./common-args');
const { MEDIOS, cacheDir, cachedMedia, pruneCache } = require('./media-cache');

const TIMEOUT_DESCARGA_MS = 180000;

/** Descarga el audio o el video de un tema a la cache y devuelve su ruta. */
async function downloadMedia(state, medio, videoId) {
  const ya = cachedMedia(state, medio, videoId);
  if (ya) return ya.ruta;
  await ensureReady(state);
  fs.mkdirSync(cacheDir(state, medio), { recursive: true });
  const out = await runYtdlp(state, [
    `https://www.youtube.com/watch?v=${videoId}`,
    '-f', MEDIOS[medio].formato,
    '--no-playlist', '--quiet', '-o', path.join(cacheDir(state, medio), '%(id)s.%(ext)s'),
    ...commonArgs(state),
  ], { timeoutMs: TIMEOUT_DESCARGA_MS });
  const listo = cachedMedia(state, medio, videoId);
  if (out.code !== 0 || !listo) throw new Error(out.stderr.trim() || `yt-dlp exit ${out.code}`);
  pruneCache(state, medio);
  return listo.ruta;
}

module.exports = { downloadMedia };
