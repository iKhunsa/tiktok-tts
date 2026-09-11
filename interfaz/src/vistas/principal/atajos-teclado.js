import { appSettings, saveSettings } from '../../nucleo/estado/ajustes-app.js';
import { t } from '../../nucleo/i18n/i18n.js';
import { showToast } from '../../componentes/toast.js';
import { escaparHtml as escapeHtml } from '../../../compartido/escapar-html.js';
import { togglePauseTts, skipCurrentTTS, clearTTSQueue } from '../../nucleo/tts/cola-tts.js';
import { musicTogglePause, musicSkip } from './bot-musica.js';

export let capturingShortcutFor = null; // 'pause' | 'skip' | 'clear' | 'musicPause' | 'musicSkip' | null

const TTS_SHORTCUT_ACTIONS = {
  pause: { settingKey: 'pauseShortcut', inputId: 'pauseShortcutInput', hintId: 'pauseShortcutHint', run: () => togglePauseTts() },
  skip: { settingKey: 'skipShortcut', inputId: 'skipShortcutInput', hintId: 'skipShortcutHint', run: () => skipCurrentTTS() },
  clear: { settingKey: 'clearShortcut', inputId: 'clearShortcutInput', hintId: 'clearShortcutHint', run: () => clearTTSQueue() },
  musicPause: { settingKey: 'musicPauseShortcut', inputId: 'musicPauseShortcutInput', hintId: 'musicPauseShortcutHint', run: () => musicTogglePause() },
  musicSkip: { settingKey: 'musicSkipShortcut', inputId: 'musicSkipShortcutInput', hintId: 'musicSkipShortcutHint', run: () => musicSkip() },
};
const ttsShortcutGlobalActive = { pause: false, skip: false, clear: false, musicPause: false, musicSkip: false };

/** Lista de acciones + su clave de appSettings, para el re-registro de
 * atajos globales al arrancar (index.js#iniciarArranque). */
export const TTS_SHORTCUT_ACTIONS_KEYS = Object.keys(TTS_SHORTCUT_ACTIONS);

export function startCapturingShortcut(action) {
  if (!TTS_SHORTCUT_ACTIONS[action]) return;
  capturingShortcutFor = action;
  const inp = document.getElementById(TTS_SHORTCUT_ACTIONS[action].inputId);
  if (inp) { inp.value = '⌨ Presiona teclas...'; inp.style.borderColor = 'var(--accent)'; }
}

export async function clearTtsShortcut(action) {
  const cfg = TTS_SHORTCUT_ACTIONS[action];
  if (!cfg) return;
  appSettings[cfg.settingKey] = null;
  ttsShortcutGlobalActive[action] = false;
  saveSettings();
  capturingShortcutFor = null;
  renderShortcutDisplay(action);
  if (window.electronAPI?.registerTtsShortcut) {
    await window.electronAPI.registerTtsShortcut(action, '');
  }
}

export function renderShortcutDisplay(action = null, status = null) {
  if (!action) {
    for (const a of Object.keys(TTS_SHORTCUT_ACTIONS)) renderShortcutDisplay(a);
    return;
  }
  const cfg = TTS_SHORTCUT_ACTIONS[action];
  if (!cfg) return;
  const shortcut = appSettings[cfg.settingKey] || null;
  const inp = document.getElementById(cfg.inputId);
  const hint = document.getElementById(cfg.hintId);
  if (inp) { inp.value = shortcut || ''; inp.style.borderColor = shortcut ? 'var(--accent)' : 'var(--border)'; }
  if (hint) {
    if (status && status.ok === false) {
      hint.style.color = '#FFBB00';
      hint.innerHTML = `${escapeHtml(t('conn.shortcutNotRegisteredPrefix'))} <span style="font-family:monospace;font-weight:600;">${escapeHtml(status.shortcut || shortcut || '')}</span>. ${escapeHtml(status.error || t('conn.shortcutTryAnother'))}`;
    } else {
      hint.style.color = 'var(--text-muted)';
      hint.innerHTML = `<span data-i18n="conn.shortcutHint">${t('conn.shortcutHint')}</span> <span style="color:var(--accent);font-family:monospace;font-weight:600;">${escapeHtml(shortcut || '—')}</span>`;
    }
  }
}

export async function registerTtsShortcut(action, shortcut, { silent = false } = {}) {
  const cfg = TTS_SHORTCUT_ACTIONS[action];
  if (!cfg) return false;
  if (!window.electronAPI?.registerTtsShortcut) {
    renderShortcutDisplay(action, { ok: false, shortcut, error: 'Los atajos globales solo funcionan dentro de Electron.' });
    return false;
  }
  const status = await window.electronAPI.registerTtsShortcut(action, shortcut);
  if (status?.ok) {
    ttsShortcutGlobalActive[action] = true;
    appSettings[cfg.settingKey] = status.shortcut;
    saveSettings();
    renderShortcutDisplay(action, status);
    if (!silent) showToast(t('conn.shortcutRegistered', { shortcut: status.shortcut }));
    return true;
  }
  ttsShortcutGlobalActive[action] = false;
  const errMsg = status?.error === 'conflict' ? t('conn.shortcutConflict') : (status && status.error);
  renderShortcutDisplay(action, status ? { ...status, error: errMsg || status.error } : { ok: false, shortcut, error: t('conn.shortcutUnavailable') });
  if (!silent) showToast(errMsg || t('conn.shortcutUnavailable'));
  return false;
}

/** Usado por el listener de Electron onTtsShortcut (atajo global del SO). */
export function ejecutarAccionAtajo(action) {
  TTS_SHORTCUT_ACTIONS[action]?.run();
}

export async function applyTtsShortcutPreset(action, shortcut) {
  capturingShortcutFor = null;
  await registerTtsShortcut(action, shortcut);
}

function matchShortcut(e, shortcut) {
  if (!shortcut) return false;
  const parts = shortcut.split('+');
  const key = parts[parts.length - 1];
  const needCtrl = parts.includes('Ctrl');
  const needShift = parts.includes('Shift');
  const needAlt = parts.includes('Alt');
  return e.ctrlKey === needCtrl && e.shiftKey === needShift && e.altKey === needAlt && e.key.toUpperCase() === key.toUpperCase();
}

export function iniciarAtajosTeclado() {
  document.addEventListener('keydown', async (e) => {
    // Tecla mantenida = un solo disparo. Sin esto, mantener pulsado el atajo de
    // skip genera una rafaga de skipCurrentTTS() (auto-repeat del SO).
    if (e.repeat && !capturingShortcutFor) return;
    if (capturingShortcutFor) {
      if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;
      e.preventDefault();
      const parts = [];
      if (e.ctrlKey) parts.push('Ctrl');
      if (e.shiftKey) parts.push('Shift');
      if (e.altKey) parts.push('Alt');
      parts.push(e.key.length === 1 ? e.key.toUpperCase() : e.key);
      const shortcut = parts.join('+');
      const action = capturingShortcutFor;
      capturingShortcutFor = null;
      appSettings[TTS_SHORTCUT_ACTIONS[action].settingKey] = shortcut;
      renderShortcutDisplay(action);
      await registerTtsShortcut(action, shortcut);
      return;
    }
    for (const [action, cfg] of Object.entries(TTS_SHORTCUT_ACTIONS)) {
      const sc = appSettings[cfg.settingKey];
      if (sc && !ttsShortcutGlobalActive[action] && matchShortcut(e, sc)) {
        e.preventDefault();
        cfg.run();
        return;
      }
    }
  });
}
