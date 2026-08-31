import { t } from '../../nucleo/i18n/i18n.js';
import { markClip } from './clips.js';
import { ejecutarAccionAtajo } from './atajos-teclado.js';
import { spPlaySound } from './soundpad.js';

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
          if (text) text.textContent = t('update.available').replace('{version}', ev.version);
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
          if (text) text.textContent = t('update.readyToInstall', { version: ev.version });
          if (barWrap) barWrap.style.display = 'none';
          if (pct) pct.style.display = 'none';
          if (spd) spd.style.display = 'none';
          if (btnInst) { btnInst.style.display = 'inline-block'; btnLater.style.display = 'inline-block'; }
          break;
        case 'error':
          banner.classList.remove('visible');
          console.error('[updater]', ev.message);
          break;
      }
    }));
  }
  window.addEventListener('beforeunload', () => {
    electronCleanups.forEach((fn) => { if (typeof fn === 'function') fn(); });
  });
}
