'use strict';

const { spawnChild } = require('./spawn-child');
const { commonArgs } = require('./common-args');
const { STDERR_TAIL_MAX } = require('./run-ytdlp');

// Stream de audio a stdout. Formato unico ya muxeado (webm/m4a) -> sin ffmpeg.
// Llamar solo con el engine ready (el endpoint hace ensureReady antes).
function createStream(state, videoId) {
  const child = spawnChild(state, [
    `https://www.youtube.com/watch?v=${videoId}`,
    '-f', 'bestaudio[ext=webm]/bestaudio/best',
    '--no-playlist', '-o', '-', '--quiet',
    ...commonArgs(state),
  ]);
  let stderrTail = '';
  child.stderr.on('data', (d) => { stderrTail = (stderrTail + d).slice(-STDERR_TAIL_MAX); });
  child.stderrTail = () => stderrTail.trim();
  return child;
}

module.exports = { createStream };
