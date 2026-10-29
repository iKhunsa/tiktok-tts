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

// Estado del modal de actualizacion (ver #updateFlowModal en index.html):
// 'confirm' (pregunta si descargar) -> 'downloading' (con cancelar) ->
// 'ready' (pregunta si instalar) -> 'installing' (bloqueado, sin acciones) -
// o 'error' en cualquier punto. `ultimoDisponible` guarda el {version,
// prerelease} del ultimo chequeo exitoso para poder reabrir el modal desde
// el banner sin pedirle de nuevo al proceso principal.
let flowEstado = 'idle';
let ultimoDisponible = null;
// true mientras el chequeo lo disparo el boton "Buscar actualizaciones" (no
// el automatico al arrancar) -- asi sabemos si hay que avisar con un toast
// cuando no hay nada nuevo, o abrir el modal directo en vez de solo prender
// el banner.
let chequeoManual = false;

function elementosFlow() {
  return {
    modal: document.getElementById('updateFlowModal'),
    close: document.getElementById('updateFlowClose'),
    title: document.getElementById('updateFlowTitle'),
    desc: document.getElementById('updateFlowDesc'),
    barWrap: document.getElementById('update-bar-wrap'),
    barFill: document.getElementById('update-bar-fill'),
    pct: document.getElementById('update-percent'),
    spd: document.getElementById('update-speed'),
    primary: document.getElementById('updateFlowPrimary'),
    secondary: document.getElementById('updateFlowSecondary'),
  };
}

function pintarFlow(estado, info) {
  flowEstado = estado;
  const els = elementosFlow();
  if (!els.modal) return;
  const bloqueado = estado === 'downloading' || estado === 'installing';
  if (els.close) els.close.style.display = bloqueado ? 'none' : '';
  if (els.barWrap) els.barWrap.style.display = 'none';
  if (els.pct) els.pct.style.display = 'none';
  if (els.spd) els.spd.style.display = 'none';
  els.primary.hidden = true;
  els.secondary.hidden = true;
  els.primary.onclick = null;
  els.secondary.onclick = null;

  if (estado === 'confirm') {
    els.title.textContent = info.prerelease
      ? t('update.experimentalAvailable', { version: info.version })
      : t('update.available').replace('{version}', info.version);
    els.desc.textContent = t('update.confirmDesc');
    els.primary.hidden = false; els.primary.textContent = t('update.downloadNow'); els.primary.onclick = confirmarDescargaUpdate;
    els.secondary.hidden = false; els.secondary.textContent = t('update.later'); els.secondary.onclick = () => closeUpdateFlowModal();
  } else if (estado === 'downloading') {
    els.title.textContent = t('update.downloading').replace('{version}', info?.version || '?');
    els.desc.textContent = '';
    if (els.barWrap) els.barWrap.style.display = 'block';
    if (els.pct) { els.pct.style.display = 'inline'; els.pct.textContent = '0%'; }
    els.secondary.hidden = false; els.secondary.textContent = t('btn.cancel'); els.secondary.onclick = cancelarDescargaUpdate;
  } else if (estado === 'ready') {
    els.title.textContent = info.prerelease
      ? t('update.experimentalReadyToInstall', { version: info.version })
      : t('update.readyToInstall', { version: info.version });
    els.desc.textContent = '';
    els.primary.hidden = false; els.primary.textContent = t('update.installNow'); els.primary.onclick = doInstallUpdate;
    els.secondary.hidden = false; els.secondary.textContent = t('update.later'); els.secondary.onclick = () => closeUpdateFlowModal();
  } else if (estado === 'installing') {
    els.title.textContent = t('update.installing');
    els.desc.textContent = t('update.installingDesc');
  } else if (estado === 'error') {
    els.title.textContent = t('update.errorTitle');
    els.desc.textContent = t('update.rollback.error');
    els.secondary.hidden = false; els.secondary.textContent = t('cuentaModal.close'); els.secondary.onclick = () => closeUpdateFlowModal();
  }
}

/** Abre el modal con la info del ultimo chequeo (banner "Ver", o un chequeo
 * manual que encontro algo). No pide nada nuevo al proceso principal. */
export function openUpdateFlowModal() {
  if (!ultimoDisponible) return;
  pintarFlow('confirm', ultimoDisponible);
  document.getElementById('updateFlowModal')?.classList.add('show');
}

/** Bloqueado (sin efecto) mientras se descarga o instala -- ni la X ni un
 * click afuera del modal pueden cerrarlo en esos dos estados a proposito. */
export function closeUpdateFlowModal(event) {
  if (event && event.target.id !== 'updateFlowModal') return;
  if (flowEstado === 'downloading' || flowEstado === 'installing') return;
  document.getElementById('updateFlowModal')?.classList.remove('show');
}

export function confirmarDescargaUpdate() {
  pintarFlow('downloading', ultimoDisponible);
  window.electronAPI?.confirmUpdateDownload();
}

export function cancelarDescargaUpdate() {
  window.electronAPI?.cancelUpdateDownload();
}

export function doInstallUpdate() {
  pintarFlow('installing', ultimoDisponible);
  window.electronAPI?.installUpdate?.();
}

export function doCheckForUpdates() {
  chequeoManual = true;
  window.electronAPI?.checkForUpdates?.();
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
      const btnView = document.getElementById('update-btn-view');
      const btnLater = document.getElementById('update-btn-later');
      const { barFill, pct, spd } = elementosFlow();
      if (!banner) return;
      switch (ev.type) {
        case 'checking':
          banner.classList.add('visible');
          if (text) text.textContent = t('update.checking');
          if (btnView) btnView.style.display = 'none';
          if (btnLater) btnLater.style.display = 'none';
          break;
        case 'available':
          ultimoDisponible = { version: ev.version, prerelease: ev.prerelease };
          if (chequeoManual) {
            chequeoManual = false;
            banner.classList.remove('visible');
            openUpdateFlowModal();
          } else {
            banner.classList.add('visible');
            if (text) {
              text.textContent = ev.prerelease
                ? t('update.experimentalAvailable', { version: ev.version })
                : t('update.available').replace('{version}', ev.version);
            }
            if (btnView) btnView.style.display = 'inline-block';
            if (btnLater) btnLater.style.display = 'inline-block';
          }
          break;
        case 'not-available':
          banner.classList.remove('visible');
          ultimoDisponible = null;
          if (chequeoManual) { chequeoManual = false; showToast(t('update.upToDate')); }
          break;
        case 'progress':
          if (flowEstado !== 'downloading') pintarFlow('downloading', ultimoDisponible);
          if (barFill) barFill.style.width = ev.percent + '%';
          if (pct) { pct.style.display = 'inline'; pct.textContent = ev.percent + '%'; }
          if (spd && ev.bytesPerSecond) { spd.style.display = 'inline'; spd.textContent = fmtBytes(ev.bytesPerSecond) + '/s'; }
          break;
        case 'ready':
          ultimoDisponible = { version: ev.version, prerelease: ev.prerelease };
          pintarFlow('ready', ultimoDisponible);
          document.getElementById('updateFlowModal')?.classList.add('show');
          break;
        case 'cancelled':
          showToast(t('update.cancelled'));
          closeUpdateFlowModal();
          flowEstado = 'idle';
          break;
        case 'installing':
          pintarFlow('installing', ultimoDisponible);
          break;
        case 'error':
          console.error('[updater]', ev.message);
          if (flowEstado === 'downloading' || flowEstado === 'installing') {
            pintarFlow('error');
          } else if (chequeoManual) {
            chequeoManual = false;
            showToast(t('update.errorTitle'));
          } else {
            banner.classList.remove('visible');
          }
          break;
        // El rollback ya pide confirmacion antes de arrancar (rollbackToVersion
        // usa confirm() nativo) y no comparte el abort-controller del update
        // hacia adelante -- muestra el progreso en el banner, sin reusar el
        // modal nuevo (ese Cancelar no lo detendria de verdad).
        case 'rollback-downloading':
          banner.classList.add('visible');
          if (text) text.textContent = t('update.rollback.downloading', { version: ev.version }) + (ev.percent ? ` (${ev.percent}%)` : '');
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
