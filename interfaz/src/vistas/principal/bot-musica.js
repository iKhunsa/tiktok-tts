import { t, tErr } from '../../nucleo/i18n/i18n.js';
import { showToast } from '../../componentes/toast.js';
import { escaparHtml as escHtml } from '../../../compartido/escapar-html.js';

let musicAudio = null;
let musicVol = 0.5;
let musicCurrentTrack = null;
let musicProgressInterval = null;
export let musicQueue = [];
// Peticiones !p que el server ya acepto pero todavia esta resolviendo
// (yt-dlp descargando/extrayendo la primera vez, o buscando el video).
export let musicPending = [];
// Estado del motor yt-dlp: 'preparing' | 'downloading' | 'error' | null.
let musicEngineStatus = null;
let musicEngineErrorTimer = null;

/** ws-cliente.js necesita reasignar musicQueue en varios casos del
 * dispatcher (`music-now-playing`, `music-queued`); es un `let` de este
 * modulo, asi que el import de otro modulo pide el cambio por aca. */
export function setMusicQueue(q) { musicQueue = q; }
export function setMusicVol(v) { musicVol = v; }
/** Getter: musicAudio se reasigna (nuevo Audio / null) dentro de este
 * modulo; otros modulos lo leen via esta funcion, no por import directo. */
export function getMusicAudio() { return musicAudio; }

export function musicOnEngineStatus(status) {
  clearTimeout(musicEngineErrorTimer);
  if (status === 'ready') {
    musicEngineStatus = null;
  } else if (status === 'error') {
    musicEngineStatus = 'error';
    showToast(t('toast.musicEngineError'));
    musicEngineErrorTimer = setTimeout(() => { musicEngineStatus = null; musicRenderQueue(); }, 20000);
  } else if (status === 'downloading' || status === 'preparing') {
    if (musicEngineStatus == null) showToast(t('toast.musicEngineDownloading'));
    musicEngineStatus = status;
  }
  musicRenderQueue();
}

function musicEngineBannerHtml() {
  if (musicEngineStatus === 'downloading' || musicEngineStatus === 'preparing') {
    return `
    <div class="queue-item pending">
      <span class="queue-spinner"></span>
      <div style="flex:1;min-width:0;">
        <div style="font-size:13px;font-weight:500;">${escHtml(t('toast.musicEngineDownloading'))}</div>
      </div>
    </div>`;
  }
  if (musicEngineStatus === 'error') {
    return `
    <div class="queue-item" style="color:var(--danger,#e5484d);">
      <span style="flex-shrink:0;">⚠</span>
      <div style="flex:1;min-width:0;font-size:13px;">${escHtml(t('toast.musicEngineError'))}</div>
    </div>`;
  }
  return '';
}

function musicPrunePending() {
  const cutoff = Date.now() - 120000; // 2 min: si no llego queued/failed, soltar el spinner
  const before = musicPending.length;
  musicPending = musicPending.filter((p) => p.ts > cutoff);
  return musicPending.length !== before;
}
export function musicDropPending(id) {
  if (!id) return;
  musicPending = musicPending.filter((p) => p.id !== id);
}

// Desecha el Audio activo sin disparar sus handlers: asignar src='' lanza el
// load algorithm contra la URL de la pagina -> evento error fantasma que
// llamaba /api/music/next de mas y drenaba la cola en cascada.
function musicDisposeAudio() {
  if (!musicAudio) return;
  musicAudio.onerror = null;
  musicAudio.onended = null;
  musicAudio.pause();
  musicAudio.removeAttribute('src');
  musicAudio = null;
}

function musicPlayTrack(track) {
  musicDisposeAudio();
  clearInterval(musicProgressInterval);
  musicCurrentTrack = track;
  const audio = new Audio(`/api/music/stream?videoId=${track.videoId}`);
  musicAudio = audio;
  audio.volume = musicVol;
  audio.play().catch(() => {});
  audio.onerror = () => {
    if (audio !== musicAudio) return; // evento tardio de un Audio ya descartado
    console.error('music stream error', audio.error?.message);
    showToast(t('toast.songError'));
    fetch('/api/music/next', { method: 'POST' }).catch(() => {});
  };
  audio.onended = () => {
    if (audio !== musicAudio) return;
    fetch('/api/music/next', { method: 'POST' }).catch(() => {});
  };
  const durSecs = parseDurationSecs(track.duration);
  const timeEl = document.getElementById('music-time');
  if (durSecs > 0) {
    const started = Date.now();
    const tick = () => {
      const elapsed = Math.min(durSecs, (Date.now() - started) / 1000);
      const pct = Math.min(100, (elapsed / durSecs) * 100);
      const bar = document.getElementById('music-progress-bar');
      if (bar) bar.style.width = pct + '%';
      if (timeEl) timeEl.textContent = `${formatSecs(elapsed)} / ${formatSecs(durSecs)}`;
      if (pct >= 100) clearInterval(musicProgressInterval);
    };
    tick();
    musicProgressInterval = setInterval(tick, 1000);
  } else if (timeEl) {
    timeEl.textContent = '';
  }
}

function parseDurationSecs(dur) {
  if (!dur) return 0;
  const parts = String(dur).split(':').map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return 0;
}

function formatSecs(secs) {
  secs = Math.max(0, Math.floor(secs));
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function musicStop() {
  musicDisposeAudio();
  clearInterval(musicProgressInterval);
  musicCurrentTrack = null;
  musicRenderNowPlaying(null);
  updateMusicPauseBtn();
}

export function musicRenderNowPlaying(track) {
  const idle = document.getElementById('music-idle-msg');
  const info = document.getElementById('music-track-info');
  const bar = document.getElementById('music-progress-bar');
  if (!track) {
    if (idle) idle.style.display = '';
    if (info) info.style.display = 'none';
    if (bar) bar.style.width = '0%';
    const timeEl = document.getElementById('music-time');
    if (timeEl) timeEl.textContent = '';
    const playlistActive = document.getElementById('music-playlist-active');
    if (playlistActive) playlistActive.style.display = 'none';
    return;
  }
  if (idle) idle.style.display = 'none';
  if (info) info.style.display = 'flex';
  const thumb = document.getElementById('music-thumb');
  const title = document.getElementById('music-title');
  const channel = document.getElementById('music-channel');
  const req = document.getElementById('music-req');
  if (thumb) thumb.src = track.thumbnail || '';
  if (title) title.textContent = track.title || t('mobile3.noTitle');
  if (channel) channel.textContent = track.channelName || '';
  if (req) {
    if (track.platform === 'playlist') {
      req.textContent = t('mobile3.streamerPlaylist');
      const pa = document.getElementById('music-playlist-active');
      const pt = document.getElementById('playlist-now-title');
      if (pa) pa.style.display = '';
      if (pt) pt.textContent = track.title || '';
    } else {
      req.textContent = track.requestedBy ? `Pedido por ${track.requestedBy}` : '';
      const pa = document.getElementById('music-playlist-active');
      if (pa) pa.style.display = 'none';
    }
  }
  if (!musicProgressInterval) {
    if (bar) bar.style.width = '0%';
    const timeEl = document.getElementById('music-time');
    if (timeEl) {
      const durSecs = parseDurationSecs(track.duration);
      timeEl.textContent = durSecs > 0 ? `0:00 / ${formatSecs(durSecs)}` : '';
    }
  }
}

export function musicRenderQueue() {
  const list = document.getElementById('music-queue-list');
  const count = document.getElementById('music-queue-count');
  if (!list) return;
  musicPrunePending();
  if (count) count.textContent = `(${musicQueue.length + musicPending.length})`;
  const engineHtml = musicEngineBannerHtml();
  if (musicQueue.length === 0 && musicPending.length === 0 && !engineHtml) {
    list.innerHTML = `<div style="color:var(--text-muted);font-size:13px;">${t('bot.queueEmpty')}</div>`;
    return;
  }
  const pendingHtml = musicPending.map((p) => `
    <div class="queue-item pending">
      <span class="queue-spinner"></span>
      <div style="flex:1;min-width:0;">
        <div style="font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${t('bot.requestResolving', { query: escHtml(p.query || '') })}</div>
        <div style="font-size:11px;color:var(--text-muted);">${escHtml(p.user || '')}</div>
      </div>
    </div>`).join('');
  list.innerHTML = engineHtml + pendingHtml + musicQueue.map((track, i) => `
    <div class="queue-item">
      <span style="font-size:11px;color:var(--text-muted);min-width:16px;">${i + 1}</span>
      <div style="flex:1;min-width:0;">
        <div style="font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escHtml(track.title || '')}</div>
        <div style="font-size:11px;color:var(--text-muted);">${escHtml(track.requestedBy || '')}</div>
      </div>
      <button class="queue-item-remove" onclick="musicRemoveFromQueue(${i})" title="${t('btn.remove')}">✕</button>
    </div>`).join('');
}

// Solo splice local — la cola real vive server-side y se resincroniza en
// el proximo evento (mismo comportamiento ya aceptado de musicClearQueue).
export function musicRemoveFromQueue(index) {
  musicQueue.splice(index, 1);
  musicRenderQueue();
}

export function musicOnNowPlaying(track) {
  musicPlayTrack(track);
  musicRenderNowPlaying(track);
  updateMusicPauseBtn();
}

export function musicOnIdle() {
  musicStop();
  musicQueue = [];
  musicPending = [];
  musicRenderQueue();
}

export function musicOnStateSync(data) {
  if (typeof data.enabled === 'boolean') {
    syncMusicChip('musicEnabledToggle', data.enabled);
  }
  if (typeof data.volume === 'number') {
    musicVol = data.volume;
    if (musicAudio) musicAudio.volume = musicVol;
    const vr = document.getElementById('musicVolRange');
    const vv = document.getElementById('musicVolVal');
    if (vr) vr.value = musicVol;
    if (vv) vv.textContent = Math.round(musicVol * 100) + '%';
  }
  if (typeof data.playlistEnabled === 'boolean') {
    syncMusicChip('playlistEnabledToggle', data.playlistEnabled);
  }
}

// Ultimo contenido de playlist confirmado por el server — para detectar
// ediciones sin guardar antes de activar el toggle.
let playlistSavedValue = '';
// Canciones reales tras expandir URLs de playlist (puede ser >> que lineas).
let playlistResolvedCount = null;

export function musicOnPlaylistUpdate(data) {
  if (Array.isArray(data.playlist)) playlistResolvedCount = data.playlist.length;
  if (data.raw) {
    playlistSavedValue = data.raw.join('\n');
    const ta = document.getElementById('playlistTextarea');
    if (ta && !ta.dataset.dirty) { ta.value = playlistSavedValue; updatePlaylistInfo(); }
  }
}

function playlistLines(ta) {
  return (ta ? ta.value : '').split('\n').map((l) => l.trim()).filter(Boolean);
}
function playlistIsUnsaved(ta) {
  return playlistLines(ta).join('\n') !== playlistSavedValue.split('\n').map((l) => l.trim()).filter(Boolean).join('\n');
}

export function musicSkip() {
  fetch('/api/music/skip', { method: 'POST' }).catch(() => {});
}

// Sincroniza checked del switch (+ clase .active si algun toggle-chip viejo
// sigue usando ese patron en vez del switch estilo iOS).
function syncMusicChip(id, checked) {
  const cb = document.getElementById(id);
  if (!cb) return;
  cb.checked = checked;
  cb.closest('.toggle-chip')?.classList.toggle('active', checked);
  if (id === 'musicEnabledToggle') {
    const label = document.getElementById('musicEnabledLabel');
    if (label) label.textContent = checked ? t('bot.cmdActive') : t('bot.enableCmd');
  }
}

export function musicTogglePause() {
  if (!musicAudio) return;
  if (musicAudio.paused) musicAudio.play().catch(() => {});
  else musicAudio.pause();
  updateMusicPauseBtn();
}

function updateMusicPauseBtn() {
  const btn = document.getElementById('btnMusicPause');
  const icon = document.getElementById('musicPauseIcon');
  const label = document.getElementById('musicPauseLabel');
  if (!btn) return;
  const paused = !musicAudio || musicAudio.paused;
  if (icon) icon.src = paused ? 'icons/play_arrow.svg' : 'icons/pause.svg';
  if (label) label.textContent = paused ? t('bot.resumeSong') : t('bot.pauseSong');
}

export function musicSetEnabled(val) {
  syncMusicChip('musicEnabledToggle', val);
  fetch('/api/music/config', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ musicEnabled: val }) }).catch(() => {});
}

export function musicSetVolume(val) {
  musicVol = parseFloat(val);
  const vv = document.getElementById('musicVolVal');
  if (vv) vv.textContent = Math.round(musicVol * 100) + '%';
  if (musicAudio) musicAudio.volume = musicVol;
  fetch('/api/music/config', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ musicVolume: musicVol }) }).catch(() => {});
}

export function musicSaveCooldown(val) {
  const secs = Math.max(0, parseInt(val, 10) || 0);
  fetch('/api/music/config', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ musicUserCooldownMs: secs * 1000 }) }).catch(() => {});
}

export function musicSaveMaxQueue(val) {
  const n = Math.max(1, Math.min(50, parseInt(val, 10) || 10));
  fetch('/api/music/config', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ musicMaxQueue: n }) }).catch(() => {});
}

export function musicClearQueue() {
  musicQueue = [];
  musicPending = [];
  musicRenderQueue();
  // No hay endpoint de servidor: la cola se vacia naturalmente
}

export function musicBanUser() {
  const input = document.getElementById('musicBanInput');
  if (!input || !input.value.trim()) return;
  const username = input.value.trim().replace(/^@/, '');
  fetch('/api/music/ban', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username }) })
    .then((r) => r.json()).then((d) => { input.value = ''; musicRenderBanned(d.banned || []); }).catch(() => {});
}

export function musicUnbanUser(username) {
  fetch('/api/music/unban', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username }) })
    .then((r) => r.json()).then((d) => musicRenderBanned(d.banned || [])).catch(() => {});
}

function musicRenderBanned(banned) {
  const list = document.getElementById('music-banned-list');
  if (!list) return;
  list.innerHTML = banned.map((u) => `
    <span style="display:inline-flex;align-items:center;gap:4px;background:var(--surface);border:1px solid var(--border);border-radius:9999px;padding:3px 10px;font-size:12px;">
      ${escHtml(u)}
      <button onclick="musicUnbanUser('${escHtml(u)}')" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:14px;line-height:1;padding:0;">×</button>
    </span>`).join('');
}

export function playlistSave() {
  const ta = document.getElementById('playlistTextarea');
  if (!ta) return Promise.resolve();
  const lines = playlistLines(ta);
  ta.dataset.dirty = '';
  return fetch('/api/music/playlist', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lines }) })
    .then((r) => r.json().catch(() => ({}))).then((d) => {
      delete ta.dataset.dirty;
      playlistSavedValue = lines.join('\n');
      if (typeof d.count === 'number') playlistResolvedCount = d.count;
      updatePlaylistInfo();
      showToast(t('toast.playlistSaved'));
    }).catch(() => {});
}

export async function playlistSetEnabled(val) {
  const ta = document.getElementById('playlistTextarea');
  if (val) {
    // Activar sin canciones = toggle encendido y en silencio. Guardar
    // primero las ediciones pendientes; si no hay ninguna, avisar y revertir.
    if (playlistLines(ta).length === 0) {
      showToast(t('toast.playlistEmpty'));
      syncMusicChip('playlistEnabledToggle', false);
      return;
    }
    if (playlistIsUnsaved(ta)) await playlistSave();
  }
  syncMusicChip('playlistEnabledToggle', val);
  fetch('/api/music/playlist/toggle', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: val }) }).catch(() => {});
}

export function playlistSetShuffle(val) {
  syncMusicChip('playlistShuffleToggle', val);
  fetch('/api/music/playlist/shuffle', { method: 'POST' }).catch(() => {});
}

/** Boton "Reproducir ahora": guarda pendientes, activa la playlist y fuerza
 * el arranque desde el primer tema (no corta un !p del chat en curso). */
export async function playlistPlay() {
  const ta = document.getElementById('playlistTextarea');
  if (playlistLines(ta).length === 0) { showToast(t('toast.playlistEmpty')); return; }
  if (playlistIsUnsaved(ta)) await playlistSave();
  syncMusicChip('playlistEnabledToggle', true);
  try {
    const r = await fetch('/api/music/playlist/play', { method: 'POST' });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) showToast(tErr(d, 'errors.playlistEmpty'));
    else if (d.deferred) showToast(t('toast.playlistQueuedAfterRequest'));
  } catch (_) { /* red caida: el WS reconciliara el estado */ }
}

export function musicInit() {
  fetch('/api/music/queue').then((r) => r.json()).then((d) => {
    musicQueue = d.queue || [];
    musicRenderQueue();
    if (d.current) musicRenderNowPlaying(d.current);
  }).catch(() => {});
  fetch('/api/music/config').then((r) => r.json()).then((d) => {
    musicVol = d.musicVolume ?? 0.5;
    const vr = document.getElementById('musicVolRange');
    const vv = document.getElementById('musicVolVal');
    if (vr) vr.value = musicVol;
    if (vv) vv.textContent = Math.round(musicVol * 100) + '%';
    syncMusicChip('musicEnabledToggle', d.musicEnabled !== false);
    const cd = document.getElementById('musicCooldownInput');
    if (cd) cd.value = Math.round((d.musicUserCooldownMs || 60000) / 1000);
    const mq = document.getElementById('musicMaxQueueInput');
    if (mq) mq.value = d.musicMaxQueue || 10;
    musicRenderBanned(d.musicBannedUsers || []);
  }).catch(() => {});
  fetch('/api/music/playlist').then((r) => r.json()).then((d) => {
    const ta = document.getElementById('playlistTextarea');
    playlistSavedValue = (d.raw || []).join('\n');
    if (Array.isArray(d.playlist)) playlistResolvedCount = d.playlist.length;
    if (ta && d.raw) ta.value = playlistSavedValue;
    syncMusicChip('playlistEnabledToggle', !!d.enabled);
    syncMusicChip('playlistShuffleToggle', !!d.shuffle);
    updatePlaylistInfo();
  }).catch(() => {});
}

/** Cuenta lineas no vacias del textarea y arma "{count} cancion(es) · se
 * guarda en tu carpeta de la app" — no hay soporte ICU plural en este i18n,
 * asi que se elige la palabra a mano (mismo patron que clips2.mark/marks). */
export function updatePlaylistInfo() {
  const ta = document.getElementById('playlistTextarea');
  const info = document.getElementById('playlist-info');
  if (!ta || !info) return;
  const lineCount = playlistLines(ta).length;
  const unsaved = playlistIsUnsaved(ta);
  const count = (!unsaved && playlistResolvedCount != null) ? playlistResolvedCount : lineCount;
  const songWord = count === 1 ? t('bot.songSingular') : t('bot.songPlural');
  const tail = unsaved ? t('bot.playlistUnsaved') : t('bot.playlistSavedHint');
  info.textContent = `${count} ${songWord} · ${tail}`;
}
