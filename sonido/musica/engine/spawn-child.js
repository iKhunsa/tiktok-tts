'use strict';

const { spawn } = require('child_process');

// yt-dlp >=2025.11 usa un runtime JS externo para los challenges de YouTube.
// Electron/Node >=22 sirve como runtime: se pasa el propio ejecutable con
// ELECTRON_RUN_AS_NODE=1 (heredado por el subproceso, inofensivo en node puro).
function spawnChild(state, args) {
  const child = spawn(state.ytdlpPath, args, {
    shell: false,
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
  });
  state.liveChildren.add(child);
  child.on('close', () => state.liveChildren.delete(child));
  child.on('error', () => state.liveChildren.delete(child));
  return child;
}

module.exports = { spawnChild };
