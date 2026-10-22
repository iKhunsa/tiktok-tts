import { t } from '../../nucleo/i18n/i18n.js';
import { markClip } from './clips.js';
import { ejecutarAccionAtajo } from './atajos-teclado.js';
import { spPlaySound } from './soundpad.js';
import { showToast } from '../../componentes/toast.js';
import { escaparHtml as escapeHtml } from '../../../compartido/escapar-html.js';

function fmtBytes(b) {
  if (b > 1048576) return (b / 1048576).toFixed(1) + ' MB';
  if (b > 1024) return (b / 1024).toFixed(0) + ' KB';
  return b + ' B';
}

export function doInstallUpdate() {
  const btn = document.getElementById('update-btn-install');
  if (btn) { btn.disabled = true; btn.textContent = t('update.installing'); }
  if (window.electronAPI?.installUpdate) window.electronAPI.installUpdate();
}

export function doCheckForUpdates() {
  if (window.electronAPI?.checkForUpdates) window.electronAPI.checkForUpdates();
}

function fmtFecha(iso) {
  try { return new Date(iso).toLocaleDateString(); } catch (_) { return ''; }
}

async function renderRollbackList() {
  const list = document.getElementById('rollbackList');
  if (!list) return;
  list.innerHTML = `<p style="color:var(--text-muted);">${t('update.checking')}</p>`;

  if (!window.electronAPI?.listRollbackVersions) { list.innerHTML = ''; return; }

  let versiones = [];
  try {
    versiones = await window.electronAPI.listRollbackVersions();
  } catch (_err) {
    list.innerHTML = `<p style="color:var(--text-muted);">${escapeHtml(t('update.rollback.error'))}</p>`;
    return;
  }

  if (!versiones || versiones.length === 0) {
    list.innerHTML = `<p style="color:var(--text-muted);">${t('update.rollback.empty')}</p>`;
    return;
  }

  list.innerHTML = versiones.map((v) => `
    <div class="cfg-field" style="display:flex;align-items:center;justify-content:space-between;gap:10px;">
      <span>
        <strong>v${escapeHtml(v.version)}</strong>
        ${v.prerelease ? `<span style="color:var(--text-muted);"> (${t('update.rollback.experimentalTag')})</span>` : ''}
        <span style="color:var(--text-muted);display:block;font-size:var(--text-3xs);">${escapeHtml(fmtFecha(v.publishedAt))}</span>
      </span>
      <button class="cfg-btn" onclick="rollbackToVersion('${escapeHtml(v.version)}')">${t('update.rollback.action')}</button>
    </div>
  `).join('');
}

export function openRollbackModal() {
  const modal = document.getElementById('rollbackModal');
  if (!modal) return;
  modal.classList.add('show');
  renderRollbackList();
}

export function closeRollbackModal(event) {
  if (event && event.target.id !== 'rollbackModal') return;
  const modal = document.getElementById('rollbackModal');
  if (modal) modal.classList.remove('show');
}

export async function rollbackToVersion(version) {
  if (!window.electronAPI?.rollbackToVersion) return;
  if (!confirm(t('update.rollback.confirm', { version }))) return;
  closeRollbackModal();
  const res = await window.electronAPI.rollbackToVersion(version);
  if (res && res.ok === false) showToast(t('update.rollback.error'), 'error');
}

/** Suscribe los eventos que solo existen dentro de Electron (atajos
 * globales, banner de auto-actualizacion). No-op fuera de Electron. */
export function iniciarEventosElectron() {
  if (!window.electronAPI) return;
  const electronCleanups = [];

  if (window.electronAPI.onMarkClip) electronCleanups.push(window.electronAPI.onMarkClip(() => markClip()));
  if (window.electronAPI.onTtsShortcut) electronCleanups.push(window.electronAPI.onTtsShortcut((action) => ejecutarAccionAtajo(action)));
  if (window.electronAPI.onPlaySoundpad) electronCleanups.push(window.electronAPI.onPlaySoundpad((d) => spPlaySound(d.soundId)));
  if (window.electronAPI.onUpdateEvent) {
    electronCleanups.push(window.electronAPI.onUpdateEvent((ev) => {
      const banner = document.getElementById('update-banner');
      const text = document.getElementById('update-text');
      const barWrap = document.getElementById('update-bar-wrap');
      const barFill = document.getElementById('update-bar-fill');
      const pct = document.getElementById('update-percent');
      const spd = document.getElementById('update-speed');
      const btnInst = document.getElementById('update-btn-install');
      const btnLater = document.getElementById('update-btn-later');
      if (!banner) return;
      switch (ev.type) {
        case 'checking':
          banner.classList.add('visible');
          if (text) text.textContent = t('update.checking');
          break;
        case 'available':
          if (text) {
            text.textContent = ev.prerelease
              ? t('update.experimentalAvailable', { version: ev.version })
              : t('update.available').replace('{version}', ev.version);
          }
          break;
        case 'not-available':
          banner.classList.remove('visible');
          break;
        case 'progress':
          banner.classList.add('visible');
          if (text) text.textContent = t('update.downloading').replace('{version}', ev.version || '?');
          if (barWrap) barWrap.style.display = 'block';
          if (barFill) barFill.style.width = ev.percent + '%';
          if (pct) { pct.style.display = 'inline'; pct.textContent = ev.percent + '%'; }
          if (spd) { spd.style.display = 'inline'; spd.textContent = fmtBytes(ev.bytesPerSecond) + '/s'; }
          break;
        case 'ready':
          banner.classList.add('visible');
          if (text) {
            text.textContent = ev.prerelease
              ? t('update.experimentalReadyToInstall', { version: ev.version })
              : t('update.readyToInstall', { version: ev.version });
          }
          if (barWrap) barWrap.style.display = 'none';
          if (pct) pct.style.display = 'none';
          if (spd) spd.style.display = 'none';
          if (btnInst) { btnInst.style.display = 'inline-block'; btnLater.style.display = 'inline-block'; }
          break;
        case 'error':
          banner.classList.remove('visible');
          console.error('[updater]', ev.message);
          break;
        case 'rollback-downloading':
          banner.classList.add('visible');
          if (text) text.textContent = t('update.rollback.downloading', { version: ev.version });
          if (barWrap) barWrap.style.display = 'block';
          if (barFill) barFill.style.width = (ev.percent || 0) + '%';
          if (pct) { pct.style.display = 'inline'; pct.textContent = (ev.percent || 0) + '%'; }
          break;
        case 'rollback-error':
          banner.classList.remove('visible');
          showToast(t('update.rollback.error'), 'error');
          console.error('[rollback]', ev.message);
          break;
      }
    }));
  }
  window.addEventListener('beforeunload', () => {
    electronCleanups.forEach((fn) => { if (typeof fn === 'function') fn(); });
  });
}
