// music-engine.js — motor de música basado en el binario yt-dlp.
// Reemplaza @distube/ytdl-core (repo archivado, roto contra el YouTube actual:
// 403 en todos los streams) y ytsr (deprecado en npm). El binario se descarga
// on-demand a <dataDir>/bin y se auto-actualiza con `yt-dlp -U` (1 vez/24h),
// así las roturas de YouTube se arreglan upstream sin release de la app.

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const RELEASE_BASE = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/';
const ASSET_BY_ARCH = { x64: 'yt-dlp.exe', arm64: 'yt-dlp_arm64.exe', ia32: 'yt-dlp_x86.exe' };
const UPDATE_INTERVAL_MS = 24 * 60 * 60 * 1000;
const STDERR_TAIL_MAX = 4096;

function formatDuration(secs) {
  if (!secs || isNaN(secs)) return '';
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

function createMusicEngine({ dataDir, log, onStatus }) {
  const BIN_DIR = path.join(dataDir, 'bin');
  const YTDLP = path.join(BIN_DIR, 'yt-dlp.exe');
  const UPDATE_MARKER = path.join(BIN_DIR, '.last-update-check');

  let status = { state: 'missing', version: null, error: null };
  let readyPromise = null;   // single-flight de ensureReady
  let jsRuntimeArgs = null;  // null = sin probar; [] = no soportado; [flag, valor] = activo
  const liveChildren = new Set();

  function emitStatus(state, error = null) {
    status = { state, version: status.version, error };
    try { if (onStatus) onStatus(status); } catch (_) {}
  }

  // yt-dlp ≥2025.11 usa un runtime JS externo para los challenges de YouTube.
  // Electron/Node ≥22 sirve como runtime: se pasa el propio ejecutable con
  // ELECTRON_RUN_AS_NODE=1 (heredado por el subproceso, inofensivo en node puro).
  function spawnChild(args) {
    const child = spawn(YTDLP, args, {
      shell: false,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
    });
    liveChildren.add(child);
    child.on('close', () => liveChildren.delete(child));
    child.on('error', () => liveChildren.delete(child));
    return child;
  }

  function runYtdlp(args, { timeoutMs = 25000 } = {}) {
    return new Promise((resolve) => {
      let child;
      try {
        child = spawnChild(args);
      } catch (err) {
        return resolve({ code: -1, stdout: '', stderr: err.message });
      }
      let stdout = '';
      let stderr = '';
      let done = false;
      const finish = (result) => { if (!done) { done = true; clearTimeout(timer); resolve(result); } };
      const timer = setTimeout(() => {
        try { child.kill(); } catch (_) {}
        finish({ code: -1, stdout, stderr: `timeout tras ${timeoutMs}ms` });
      }, timeoutMs);
      child.stdout.on('data', (d) => { stdout += d; });
      child.stderr.on('data', (d) => { stderr = (stderr + d).slice(-STDERR_TAIL_MAX); });
      child.on('error', (err) => finish({ code: -1, stdout, stderr: err.message }));
      child.on('close', (code) => finish({ code, stdout, stderr }));
    });
  }

  function commonArgs() {
    return ['--no-warnings', '--socket-timeout', '10', ...(jsRuntimeArgs || [])];
  }

  async function detectJsRuntime() {
    if (jsRuntimeArgs !== null) return;
    const major = parseInt(process.versions.node, 10);
    if (!(major >= 22)) { jsRuntimeArgs = []; return; }
    // La sintaxis del path varió entre versiones de yt-dlp; se prueban ambas.
    for (const sep of [':', '@']) {
      const candidate = ['--js-runtimes', `node${sep}${process.execPath}`];
      const probe = await runYtdlp([...candidate, '--version'], { timeoutMs: 30000 });
      if (probe.code === 0) { jsRuntimeArgs = candidate; return; }
    }
    jsRuntimeArgs = []; // sin runtime: yt-dlp degrada a formatos limitados, no falla
  }

  async function downloadBinary() {
    const asset = ASSET_BY_ARCH[process.arch] || 'yt-dlp.exe';
    const url = RELEASE_BASE + asset;
    fs.mkdirSync(BIN_DIR, { recursive: true });
    const tmp = YTDLP + '.download';
    emitStatus('downloading');
    log('info', 'music', 'descargando yt-dlp', { url });
    const ctrl = new AbortController();
    const abortTimer = setTimeout(() => ctrl.abort(), 180000);
    try {
      const res = await fetch(url, { redirect: 'follow', signal: ctrl.signal });
      if (!res.ok) throw new Error(`HTTP ${res.status} al descargar yt-dlp`);
      const buf = Buffer.from(await res.arrayBuffer());
      fs.writeFileSync(tmp, buf);
      fs.renameSync(tmp, YTDLP);
    } finally {
      clearTimeout(abortTimer);
      try { if (fs.existsSync(tmp)) fs.unlinkSync(tmp); } catch (_) {}
    }
  }

  function ensureReady() {
    if (status.state === 'ready') return Promise.resolve();
    if (readyPromise) return readyPromise;
    readyPromise = (async () => {
      try {
        if (!fs.existsSync(YTDLP)) await downloadBinary();
        // Primer arranque puede tardar (PyInstaller extrae a temp) → timeout generoso
        let ver = await runYtdlp(['--version'], { timeoutMs: 60000 });
        if (ver.code !== 0) {
          // Binario corrupto o incompatible → re-descargar una vez
          try { fs.unlinkSync(YTDLP); } catch (_) {}
          await downloadBinary();
          ver = await runYtdlp(['--version'], { timeoutMs: 60000 });
          if (ver.code !== 0) throw new Error(ver.stderr.trim() || `yt-dlp exit ${ver.code}`);
        }
        status.version = ver.stdout.trim();
        await detectJsRuntime();
        emitStatus('ready');
        log('info', 'music', 'yt-dlp listo', { version: status.version, jsRuntime: jsRuntimeArgs.length > 0 });
      } catch (err) {
        emitStatus('error', err.message);
        log('warn', 'music', 'yt-dlp no disponible', { error: err.message });
        throw err;
      } finally {
        readyPromise = null; // permite reintentar en el próximo request si falló
      }
    })();
    return readyPromise;
  }

  function getStatus() {
    return { ...status };
  }

  async function checkForUpdates() {
    if (status.state !== 'ready') return;
    try {
      const st = fs.statSync(UPDATE_MARKER);
      if (Date.now() - st.mtimeMs < UPDATE_INTERVAL_MS) return;
    } catch (_) { /* sin marker → chequear */ }
    if (liveChildren.size > 0) return; // nunca autoactualizar con streams activos
    try { fs.writeFileSync(UPDATE_MARKER, new Date().toISOString()); } catch (_) {}
    const out = await runYtdlp(['-U'], { timeoutMs: 120000 });
    const summary = (out.stdout || out.stderr || '').trim().split('\n').pop() || '';
    log('info', 'music', 'yt-dlp update check', { code: out.code, result: summary });
    if (out.code === 0) {
      const ver = await runYtdlp(['--version'], { timeoutMs: 60000 });
      if (ver.code === 0) status.version = ver.stdout.trim();
    }
  }

  function toTrack(j) {
    if (!j || !j.id) return null;
    const secs = Math.round(Number(j.duration) || 0);
    const thumb = j.thumbnail
      || (Array.isArray(j.thumbnails) && j.thumbnails.length ? j.thumbnails[j.thumbnails.length - 1].url : '')
      || `https://i.ytimg.com/vi/${j.id}/mqdefault.jpg`;
    return {
      videoId: j.id,
      title: j.title || '',
      channelName: j.channel || j.uploader || '',
      thumbnail: thumb,
      duration: formatDuration(secs),
    };
  }

  // Búsqueda por texto → primer resultado. El prefijo ytsearch1: garantiza que
  // texto de chat que empiece con "-" nunca se interprete como flag.
  async function search(query) {
    await ensureReady();
    const out = await runYtdlp([
      `ytsearch1:${query}`,
      '--dump-json', '--flat-playlist', '--quiet',
      ...commonArgs(),
    ]);
    if (out.code !== 0) throw new Error(out.stderr.trim() || `yt-dlp exit ${out.code}`);
    const line = out.stdout.split('\n').find(l => l.trim().startsWith('{'));
    return line ? toTrack(JSON.parse(line)) : null;
  }

  async function getInfo(videoId) {
    await ensureReady();
    const out = await runYtdlp([
      `https://www.youtube.com/watch?v=${videoId}`,
      '--dump-json', '--no-playlist', '--quiet',
      ...commonArgs(),
    ]);
    if (out.code !== 0) throw new Error(out.stderr.trim() || `yt-dlp exit ${out.code}`);
    const line = out.stdout.split('\n').find(l => l.trim().startsWith('{'));
    return line ? toTrack(JSON.parse(line)) : null;
  }

  // Stream de audio a stdout. Formato único ya muxeado (webm/m4a) → sin ffmpeg.
  // Llamar solo con el engine ready (el endpoint hace ensureReady antes).
  function createStream(videoId) {
    const child = spawnChild([
      `https://www.youtube.com/watch?v=${videoId}`,
      '-f', 'bestaudio[ext=webm]/bestaudio/best',
      '--no-playlist', '-o', '-', '--quiet',
      ...commonArgs(),
    ]);
    let stderrTail = '';
    child.stderr.on('data', (d) => { stderrTail = (stderrTail + d).slice(-STDERR_TAIL_MAX); });
    child.stderrTail = () => stderrTail.trim();
    return child;
  }

  function shutdown() {
    for (const child of liveChildren) {
      try { child.kill(); } catch (_) {}
    }
    liveChildren.clear();
  }

  return { ensureReady, getStatus, checkForUpdates, search, getInfo, createStream, shutdown };
}

module.exports = { createMusicEngine };
