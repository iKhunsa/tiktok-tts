'use strict';

const { spawn } = require('child_process');

/**
 * yt-dlp puede generar sub-hijos (ffmpeg) que no reciben SIGTERM/SIGKILL de
 * child.kill() — solo mata el proceso yt-dlp inmediato. En Windows,
 * `taskkill /T /F` mata el arbol completo (yt-dlp + sus hijos).
 */
function treeKill(child) {
  if (!child || !child.pid) return;
  if (process.platform === 'win32') {
    try {
      spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
        windowsHide: true,
        stdio: 'ignore',
      });
      return;
    } catch (_) {
      // best-effort — cae al kill directo abajo
    }
  }
  try { child.kill(); } catch (_) { /* best-effort */ }
}

module.exports = { treeKill };
