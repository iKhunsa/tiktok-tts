'use strict';

const { runYtdlp } = require('./run-ytdlp');

async function detectJsRuntime(state) {
  if (state.jsRuntimeArgs !== null) return;
  const major = parseInt(process.versions.node, 10);
  if (!(major >= 22)) { state.jsRuntimeArgs = []; return; }
  // La sintaxis del path vario entre versiones de yt-dlp; se prueban ambas.
  for (const sep of [':', '@']) {
    const candidate = ['--js-runtimes', `node${sep}${process.execPath}`];
    const probe = await runYtdlp(state, [...candidate, '--version'], { timeoutMs: 30000 });
    if (probe.code === 0) { state.jsRuntimeArgs = candidate; return; }
  }
  state.jsRuntimeArgs = []; // sin runtime: yt-dlp degrada a formatos limitados, no falla
}

module.exports = { detectJsRuntime };
