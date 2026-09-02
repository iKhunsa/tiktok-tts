import { t } from '../../nucleo/i18n/i18n.js';
import { showToast } from '../../componentes/toast.js';
import { tErr } from '../../nucleo/i18n/i18n.js';
import { sendStateSync } from '../../nucleo/tts/cola-tts.js';

const CLIPS_KEY = 'tikliveTTS_clips_v1';
let streamStartTime = null;
let streamTimerInterval = null;
let obsConnected = false;

/** Getter: streamStartTime se reasigna dentro de este modulo (dueño del
 * binding); cliente-ws.js y cola-tts.js lo leen via esta funcion. */
export function obtenerStreamStartTime() { return streamStartTime; }

export function getClipsData() {
  try { return JSON.parse(localStorage.getItem(CLIPS_KEY) || '{}'); } catch (e) { return {}; }
}
function saveClipsData(data) {
  try { localStorage.setItem(CLIPS_KEY, JSON.stringify(data)); } catch (e) { /* noop */ }
}
export function getLocalDateStr() {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function formatElapsed(ms) {
  const secs = Math.floor(ms / 1000);
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function startStreamManual() {
  if (streamStartTime) return;
  streamStartTime = Date.now();
  const btnStart = document.getElementById('btnStartStream');
  const btnStop = document.getElementById('btnStopStream');
  const btnMark = document.getElementById('btnMarkClip');
  if (btnStart) btnStart.style.display = 'none';
  if (btnStop) btnStop.style.display = 'block';
  if (btnMark) { btnMark.disabled = false; btnMark.style.cursor = 'pointer'; btnMark.style.color = 'var(--text)'; btnMark.style.background = 'var(--surface)'; }
  startTimerUI();
  sendStateSync();
}

export function stopStream() {
  streamStartTime = null;
  clearInterval(streamTimerInterval);
  streamTimerInterval = null;
  const el = document.getElementById('streamTimer');
  if (el) el.textContent = '00:00:00';
  const btnStart = document.getElementById('btnStartStream');
  const btnStop = document.getElementById('btnStopStream');
  const btnMark = document.getElementById('btnMarkClip');
  if (btnStart) btnStart.style.display = 'block';
  if (btnStop) btnStop.style.display = 'none';
  if (btnMark) { btnMark.disabled = true; btnMark.style.cursor = 'not-allowed'; btnMark.style.color = 'var(--text-muted)'; }
  sendStateSync();
}

function startTimerUI() {
  clearInterval(streamTimerInterval);
  streamTimerInterval = setInterval(() => {
    if (!streamStartTime) return;
    const elapsed = Date.now() - streamStartTime;
    const secs = Math.floor(elapsed / 1000);
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    const el = document.getElementById('streamTimer');
    if (el) el.textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }, 1000);
}

export function markClip() {
  if (!streamStartTime) { showToast(t('toast.startStreamFirst')); return; }
  if (obsConnected) fetch('/api/obs/save-replay', { method: 'POST' }).catch(() => {});
  const now = new Date();
  const elapsed = Date.now() - streamStartTime;
  const entry = {
    id: String(Date.now()),
    elapsed: formatElapsed(elapsed),
    absoluteTime: now.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    label: '',
    createdAt: now.toISOString(),
  };
  const dateStr = getLocalDateStr();
  const data = getClipsData();
  if (!data[dateStr]) data[dateStr] = [];
  data[dateStr].unshift(entry);
  saveClipsData(data);
  renderClipsHistory();
  sendStateSync();
  showToast(t('toast.clipMarked').replace('{elapsed}', entry.elapsed));
}

export function deleteClip(dateStr, id) {
  const data = getClipsData();
  if (data[dateStr]) {
    data[dateStr] = data[dateStr].filter((e) => e.id !== id);
    if (data[dateStr].length === 0) delete data[dateStr];
  }
  saveClipsData(data);
  renderClipsHistory();
  sendStateSync();
}

function updateClipLabel(dateStr, id, label) {
  const data = getClipsData();
  if (data[dateStr]) {
    const entry = data[dateStr].find((e) => e.id === id);
    if (entry) entry.label = label;
  }
  saveClipsData(data);
}

export function clearAllClips() {
  if (!confirm(t('clips2.confirmClearAll'))) return;
  localStorage.removeItem(CLIPS_KEY);
  renderClipsHistory();
}

export function renderClipsHistory() {
  const container = document.getElementById('clipsHistory');
  if (!container) return;
  const data = getClipsData();
  const dates = Object.keys(data).sort().reverse();
  if (dates.length === 0) {
    container.innerHTML = `<div style="color:var(--text-muted);font-size:13px;padding:14px 0;">${t('clips2.noMarkers')}</div>`;
    return;
  }
  container.innerHTML = '';
  dates.forEach((dateStr, idx) => {
    const entries = data[dateStr];
    const acc = document.createElement('div');
    acc.className = 'clips-day-accordion';
    const header = document.createElement('div');
    header.className = 'clips-day-header';
    const count = entries.length;
    const dateLabel = document.createElement('span');
    dateLabel.textContent = dateStr;
    const countLabel = document.createElement('span');
    countLabel.style.color = 'var(--text-muted)';
    countLabel.style.fontSize = '11px';
    countLabel.style.fontWeight = '400';
    countLabel.textContent = `${count} ${count !== 1 ? t('clips2.marks') : t('clips2.mark')} ▾`;
    header.append(dateLabel, countLabel);
    const body = document.createElement('div');
    body.className = 'clips-day-body' + (idx === 0 ? ' open' : '');
    header.onclick = () => body.classList.toggle('open');
    entries.forEach((e) => {
      const row = document.createElement('div');
      row.className = 'clip-entry';
      const elapsedEl = document.createElement('span');
      elapsedEl.className = 'clip-elapsed';
      elapsedEl.textContent = e.elapsed || '';
      const absolute = document.createElement('span');
      absolute.className = 'clip-abstime';
      absolute.textContent = e.absoluteTime || '';
      const labelWrap = document.createElement('span');
      labelWrap.className = 'clip-label';
      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = 'Etiqueta...';
      input.value = e.label || '';
      input.onchange = (ev) => updateClipLabel(dateStr, e.id, ev.target.value);
      labelWrap.appendChild(input);
      const del = document.createElement('button');
      del.className = 'clip-delete';
      del.title = t('clips2.deleteMarker');
      del.textContent = '✕';
      del.onclick = () => deleteClip(dateStr, e.id);
      row.append(elapsedEl, absolute, labelWrap, del);
      body.appendChild(row);
    });
    const dayFooter = document.createElement('div');
    dayFooter.style.cssText = 'padding:4px 0 6px;text-align:right;';
    const delDayBtn = document.createElement('button');
    delDayBtn.textContent = t('clips2.deleteDay');
    delDayBtn.style.cssText = 'background:none;border:none;cursor:pointer;font-size:11px;color:var(--text-muted);padding:2px 6px;border-radius:4px;font-family:"Inter",sans-serif;';
    delDayBtn.onmouseover = () => { delDayBtn.style.color = '#fe2c55'; };
    delDayBtn.onmouseout = () => { delDayBtn.style.color = 'var(--text-muted)'; };
    delDayBtn.onclick = () => {
      if (!confirm(`${t('clips2.confirmClearDay')} ${dateStr}?`)) return;
      const d = getClipsData(); delete d[dateStr]; saveClipsData(d); renderClipsHistory();
    };
    dayFooter.appendChild(delDayBtn);
    body.appendChild(dayFooter);
    acc.appendChild(header);
    acc.appendChild(body);
    container.appendChild(acc);
  });
}

export function updateOBSStatus(connected) {
  obsConnected = connected;
  const dot = document.getElementById('obsStatusDot');
  const text = document.getElementById('obsStatusText');
  if (dot) dot.className = 'obs-status-dot' + (connected ? ' connected' : '');
  if (text) { text.textContent = connected ? t('status.connected') : t('obs.disconnected'); text.style.color = connected ? 'var(--accent)' : 'var(--text-muted)'; }
}

export async function connectOBSFromUI() {
  const port = parseInt(document.getElementById('obsPort')?.value) || 4455;
  const password = document.getElementById('obsPassword')?.value || '';
  const btn = document.getElementById('btnConnectOBS');
  const btnDis = document.getElementById('btnDisconnectOBS');
  if (btn) { btn.disabled = true; btn.textContent = t('conn.connecting'); }
  try {
    const res = await fetch('/api/obs/connect', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ port, password }) });
    const d = await res.json();
    if (d.success) {
      updateOBSStatus(true);
      if (btn) { btn.style.display = 'none'; btn.disabled = false; btn.textContent = t('btn.connectOBS'); }
      if (btnDis) btnDis.style.display = 'inline-block';
    } else {
      showToast(t('toast.obsError').replace('{error}', tErr(d, null) || 'desconocido'));
      if (btn) { btn.disabled = false; btn.textContent = t('btn.connectOBS'); }
    }
  } catch (e) {
    showToast(t('toast.obsConnectFailed'));
    if (btn) { btn.disabled = false; btn.textContent = t('btn.connectOBS'); }
  }
}

export async function disconnectOBSFromUI() {
  await fetch('/api/obs/disconnect', { method: 'POST' }).catch(() => {});
  updateOBSStatus(false);
  const btn = document.getElementById('btnConnectOBS');
  const btnDis = document.getElementById('btnDisconnectOBS');
  if (btn) { btn.style.display = 'inline-block'; }
  if (btnDis) { btnDis.style.display = 'none'; }
}
