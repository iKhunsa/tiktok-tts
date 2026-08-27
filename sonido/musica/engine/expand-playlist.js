'use strict';

const { ensureReady } = require('./ensure-ready');
const { runYtdlp } = require('./run-ytdlp');
const { commonArgs } = require('./common-args');
const { formatDuration } = require('../format-duration');

// Techo de items al expandir una playlist de YouTube: evita que alguien pegue
// una lista de 5.000 videos y llene la memoria / cuelgue yt-dlp.
const MAX_PLAYLIST_ITEMS = 100;

// Expande una URL de playlist de YouTube a entradas individuales via
// --flat-playlist (rapido: no baja metadata de cada video, solo id/titulo).
async function expandPlaylist(state, url) {
  await ensureReady(state);
  const out = await runYtdlp(state, [
    url, '--flat-playlist', '--dump-json', '--quiet',
    '--playlist-end', String(MAX_PLAYLIST_ITEMS), ...commonArgs(state),
  ], { timeoutMs: 60000 });
  if (out.code !== 0) throw new Error(out.stderr.trim() || `yt-dlp exit ${out.code}`);

  const items = [];
  for (const line of out.stdout.split('\n')) {
    const s = line.trim();
    if (!s.startsWith('{')) continue;
    let j;
    try { j = JSON.parse(s); } catch (_) { continue; }
    if (!j.id) continue;
    const thumb = (Array.isArray(j.thumbnails) && j.thumbnails.length
      ? j.thumbnails[j.thumbnails.length - 1].url
      : `https://i.ytimg.com/vi/${j.id}/mqdefault.jpg`);
    items.push({
      raw: `https://www.youtube.com/watch?v=${j.id}`,
      videoId: j.id,
      title: j.title || j.id,
      channelName: j.channel || j.uploader || '',
      thumbnail: thumb,
      duration: formatDuration(Math.round(Number(j.duration) || 0)),
    });
  }
  return items;
}

module.exports = { expandPlaylist, MAX_PLAYLIST_ITEMS };
