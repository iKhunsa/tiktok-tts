import { t } from '../../nucleo/i18n/i18n.js';
import { esc } from './utils.js';

let mMusicEnabled = true;
let mPlaylistEnabled = false;
// Peticiones !p aceptadas por el server, aun resolviendose (yt-dlp descarga
// la primera vez -> puede tardar). [{ id, user, query, ts }]
let mPending = [];
export function mDropPending(id) { if (id) mPending = mPending.filter((p) => p.id !== id); }
export function mClearPending() { mPending = []; }
// Estado del motor yt-dlp: 'preparing' | 'downloading' | 'error' | null.
let mEngineStatus = null;
let mEngineErrTimer = null;

export function mRenderNowPlaying(track) {
  const idle = document.getElementById('m-music-idle');
  const info = document.getElementById('m-music-info');
  if (!track) {
    if (idle) idle.style.display = '';
    if (info) info.style.display = 'none';
    return;
  }
  if (idle) idle.style.display = 'none';
  if (info) info.style.display = 'flex';
  const thumb = document.getElementById('m-music-thumb');
  const title = document.getElementById('m-music-title');
  const ch = document.getElementById('m-music-channel');
  const req = document.getElementById('m-music-req');
  if (thumb) thumb.src = track.thumbnail || '';
  if (title) title.textContent = track.title || t('mobile3.noTitle');
  if (ch) ch.textContent = track.channelName || '';
  if (req) {
    req.textContent = track.platform === 'playlist'
      ? t('mobile3.streamerPlaylist')
      : (track.requestedBy ? `${t('mobile3.requestedBy')} ${esc(track.requestedBy)}` : '');
  }
}

export function mFetchQueue() {
  fetch('/api/music/queue').then((r) => r.json()).then((d) => {
    const list = document.getElementById('m-queue-list');
    const count = document.getElementById('m-queue-count');
    const q = d.queue || [];
    const cutoff = Date.now() - 120000;
    mPending = mPending.filter((p) => p.ts > cutoff);
    if (count) count.textContent = `(${q.length + mPending.length})`;
    if (!list) return;
    let engineHtml = '';
    if (mEngineStatus === 'downloading' || mEngineStatus === 'preparing') {
      engineHtml = `<div style="display:flex;gap:8px;align-items:center;padding:4px 0;border-bottom:1px solid var(--border);opacity:.9;">
        <span class="m-queue-spinner"></span>
        <div style="flex:1;min-width:0;font-size:13px;">${esc(t('toast.musicEngineDownloading'))}</div></div>`;
    } else if (mEngineStatus === 'error') {
      engineHtml = `<div style="display:flex;gap:8px;align-items:center;padding:4px 0;border-bottom:1px solid var(--border);color:#e5484d;">
        <span>⚠</span><div style="flex:1;min-width:0;font-size:13px;">${esc(t('toast.musicEngineError'))}</div></div>`;
    }
    if (!q.length && !mPending.length && !engineHtml) { list.innerHTML = `<div style="color:var(--muted);font-size:13px;">${t('mobile3.queueEmpty')}</div>`; return; }
    const pendHtml = mPending.map((p) => `
      <div style="display:flex;gap:8px;align-items:center;padding:4px 0;border-bottom:1px solid var(--border);opacity:.9;">
        <span class="m-queue-spinner"></span>
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${t('bot.requestResolving').replace('{query}', esc(p.query || ''))}</div>
          <div style="font-size:11px;color:var(--muted);">${esc(p.user || '')}</div>
        </div>
      </div>`).join('');
    list.innerHTML = engineHtml + pendHtml + q.slice(0, 5).map((track, i) => `
      <div style="display:flex;gap:8px;align-items:center;padding:4px 0;border-bottom:1px solid var(--border);">
        <span style="font-size:11px;color:var(--muted);min-width:14px;">${i + 1}</span>
        <div style="flex:1;min-width:0;">
          <div style="font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(track.title || '')}</div>
          <div style="font-size:11px;color:var(--muted);">${esc(track.requestedBy || '')}</div>
        </div>
      </div>`).join('') + (q.length > 5 ? `<div style="font-size:11px;color:var(--muted);padding-top:4px;">+${q.length - 5} más…</div>` : '');
  }).catch(() => {});
}

export function mApplyMusicState(d) {
  if (typeof d.enabled === 'boolean') {
    mMusicEnabled = d.enabled;
    const btn = document.getElementById('m-btnMusicToggle');
    if (btn) { btn.textContent = mMusicEnabled ? t('mobile3.musicOn') : t('mobile3.musicOff'); btn.style.color = mMusicEnabled ? 'var(--accent)' : 'var(--muted)'; }
  }
  if (typeof d.playlistEnabled === 'boolean') {
    mPlaylistEnabled = d.playlistEnabled;
    const s = document.getElementById('m-playlist-status');
    if (s) s.textContent = mPlaylistEnabled ? 'ON' : 'OFF';
  }
  if (typeof d.volume === 'number') mSetVolUI(d.volume);
  if (d.current) mRenderNowPlaying(d.current);
  if (typeof d.queueLength === 'number') {
    const count = document.getElementById('m-queue-count');
    if (count) count.textContent = `(${d.queueLength})`;
  }
}

export function mSetVolUI(vol) {
  const vr = document.getElementById('m-musicVolRange');
  const vv = document.getElementById('m-musicVolVal');
  if (vr) vr.value = vol;
  if (vv) vv.textContent = Math.round(vol * 100) + '%';
}

/** music-engine llega con status ready/error/downloading/preparing; el
 * error se auto-limpia a los 20s y refresca la cola (mismo timer del
 * original, cancelado en cada nuevo evento). */
export function mSetEngineStatus(status) {
  if (status === 'ready') mEngineStatus = null;
  else if (status === 'error') {
    mEngineStatus = 'error';
    clearTimeout(mEngineErrTimer);
    mEngineErrTimer = setTimeout(() => { mEngineStatus = null; mFetchQueue(); }, 20000);
  } else if (status === 'downloading' || status === 'preparing') {
    mEngineStatus = status;
  }
  mFetchQueue();
}

export function mAddPending(requestId, user, query) {
  if (requestId && !mPending.some((p) => p.id === requestId)) {
    mPending.push({ id: requestId, user, query, ts: Date.now() });
    mFetchQueue();
  }
}

export function mMusicSkip() {
  fetch('/api/mobile/command', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'musicSkip' }) }).catch(() => {});
}

export function mMusicToggle() {
  fetch('/api/mobile/command', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'musicToggle' }) }).catch(() => {});
}

export function mMusicVolume(val) {
  const v = parseFloat(val);
  const vv = document.getElementById('m-musicVolVal');
  if (vv) vv.textContent = Math.round(v * 100) + '%';
  fetch('/api/mobile/command', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'musicVolume', value: v }) }).catch(() => {});
}

export function mPlaylistToggle() {
  fetch('/api/mobile/command', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'playlistToggle' }) }).catch(() => {});
}

/** Init: hidrata now-playing/cola y config de musica al cargar (fetches
 * independientes del WS, portados 1:1). */
export function mInit() {
  fetch('/api/music/queue').then((r) => r.json()).then((d) => {
    if (d.current) mRenderNowPlaying(d.current);
    mFetchQueue();
  }).catch(() => {});
  fetch('/api/music/config').then((r) => r.json()).then((d) => {
    mMusicEnabled = d.musicEnabled !== false;
    mPlaylistEnabled = !!d.playlistEnabled;
    mSetVolUI(d.musicVolume ?? 0.5);
    const btn = document.getElementById('m-btnMusicToggle');
    if (btn) { btn.textContent = mMusicEnabled ? t('mobile3.musicOn') : t('mobile3.musicOff'); btn.style.color = mMusicEnabled ? 'var(--accent)' : 'var(--muted)'; }
    const s = document.getElementById('m-playlist-status');
    if (s) s.textContent = mPlaylistEnabled ? 'ON' : 'OFF';
  }).catch(() => {});
}
