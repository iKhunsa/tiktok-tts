'use strict';

const { ensureReady } = require('./ensure-ready');
const { runYtdlp } = require('./run-ytdlp');
const { commonArgs } = require('./common-args');
const { toTrack } = require('./to-track');

async function getInfo(state, videoId) {
  await ensureReady(state);
  const out = await runYtdlp(state, [
    `https://www.youtube.com/watch?v=${videoId}`, '--dump-json', '--no-playlist', '--quiet', ...commonArgs(state),
  ]);
  if (out.code !== 0) throw new Error(out.stderr.trim() || `yt-dlp exit ${out.code}`);
  const line = out.stdout.split('\n').find((l) => l.trim().startsWith('{'));
  return line ? toTrack(JSON.parse(line)) : null;
}

module.exports = { getInfo };
