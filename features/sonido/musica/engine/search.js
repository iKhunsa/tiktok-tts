'use strict';

const { ensureReady } = require('./ensure-ready');
const { runYtdlp } = require('./run-ytdlp');
const { commonArgs } = require('./common-args');
const { toTrack } = require('./to-track');

// Busqueda por texto -> primer resultado. El prefijo ytsearch1: garantiza que
// texto de chat que empiece con "-" nunca se interprete como flag.
async function search(state, query) {
  await ensureReady(state);
  const out = await runYtdlp(state, [`ytsearch1:${query}`, '--dump-json', '--flat-playlist', '--quiet', ...commonArgs(state)]);
  if (out.code !== 0) throw new Error(out.stderr.trim() || `yt-dlp exit ${out.code}`);
  const line = out.stdout.split('\n').find((l) => l.trim().startsWith('{'));
  return line ? toTrack(JSON.parse(line)) : null;
}

module.exports = { search };
