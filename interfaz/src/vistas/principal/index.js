/**
 * Orquestador de la app principal (index.html). Reemplaza el <script>
 * inline gigante (~4400 lineas) de la migracion vieja. Dos trabajos:
 *
 * 1. Correr la secuencia de arranque, en el MISMO ORDEN que el INIT
 *    original (loadSettings -> applySettings -> loadRuntimeConfig -> ...).
 * 2. Exponer a `window` las funciones que el markup todavia invoca por
 *    atributos inline (onclick/onchange/oninput — 119 nombres distintos,
 *    ver documentacion/plan-fases o el commit que introdujo este archivo).
 *    Es el puente documentado en el plan de modularizacion: sin el, cada
 *    boton del HTML tiraria "X is not defined" al hacer click, porque los
 *    modulos ES no agregan sus funciones a window automaticamente.
 *
 * Ningun otro modulo deberia asignar cosas a window — todo pasa por aca.
 */
import { paintRangeFill, iniciarPintadoDeRangos } from '../../componentes/campos-formulario.js';
import { showToast } from '../../componentes/toast.js';
import { iniciarCapturaErroresCliente } from '../../nucleo/log-storage.js';
import { loadSettings, applySettings, appSettings } from '../../nucleo/estado/ajustes-app.js';
import { loadRuntimeConfig } from '../../nucleo/estado/config-runtime.js';
import { connectWS } from '../../nucleo/ws/cliente-ws.js';
import {
  updateQueueBadge, skipCurrentTTS, clearTTSQueue, togglePauseTts, toggleGlobalTTS,
  enableEmergencyTTSMode, updateRate, updateVol,
} from '../../nucleo/tts/cola-tts.js';

import { t, tErr } from '../../nucleo/i18n/i18n.js';
import { iniciarI18nApp, pickLanguage, setLanguage } from './i18n-app.js';
import { switchView } from './vistas-router.js';
import { iniciarRotacionAnuncioLateral } from './anuncio-lateral.js';
import { copyToClipboard } from './utils-app.js';
import { uploadBg, removeBg } from './subida-fondo.js';
import {
  buildOverlayUrl, updateOverlayUrl, onCfgChange, onChatPlatformChange, copyCfgUrl,
  updateFollowerDisplay, testGiftAlert, testSocialAlert, testAlertType,
  updateSocialOverlayUrl, copySocialAlertUrl, testTopLikers,
} from './configurador-overlays.js';
import {
  saveTwitchClientId, loadPlatformConfigUI, connectTwitchAuth, disconnectTwitchAuth,
  loadOAuthStatusUI,
} from './oauth-twitch.js';
import {
  toggleChatToggles, toggleTwitchSection, toggleOption, setSoloChatMode,
  iniciarObservadorTogglesChat,
} from './toggles-chat.js';
import {
  startCapturingShortcut, clearTtsShortcut, renderShortcutDisplay, registerTtsShortcut,
  applyTtsShortcutPreset, iniciarAtajosTeclado, TTS_SHORTCUT_ACTIONS_KEYS,
} from './atajos-teclado.js';
import { setReadNonFollowers } from '../../nucleo/estado/config-runtime.js';
import {
  toggleVoiceDropdown, patchConfigSetting, syncTtsVoiceLang, toggleLangFilter,
  toggleDictFilter, toggleSayUsernameConnector, updateConnectorChipState, selectVoice,
  loadVoices, testVoice, iniciarCierreDropdownVoces,
} from './voces.js';
import { escapeHtml, initChatScrollFollow, clearChat } from './chat-ui.js';
import {
  openDonationsModal, closeDonationsModal, openSocialModal, closeSocialModal,
  openBugReportModal, closeBugReportModal, submitBugReport, openDictLangModal,
  closeDictLangModal, closeDonationNotice, openDonationsFromNotice, closeBugReportNotice,
  openBugReportFromNotice, closeOnboardingWelcome, closeOnboardingComplete, startOnboardingTour,
  iniciarModalesYAvisos,
} from './modales-avisos.js';
import { loadMobileURL, copyMobileURL, refreshMobileQR } from './mobile-remote.js';
import {
  markClip, clearAllClips, startStreamManual, stopStream, connectOBSFromUI,
  disconnectOBSFromUI,
} from './clips.js';
import {
  spPlaySoundWithAnim, spCardMenu, spPlayTestSound, spUploadTrigger, spHandleUpload,
  spCloseSettings, spSetSaveName, spSetSaveColor, spSettingsCapture, spSettingsClearShortcut,
  spSettingsDelete, spFilterIcons, spChooseIcon, spLoad, spRestoreShortcuts,
} from './soundpad.js';
import {
  toggleAddChannelForm, selectAddPlatform, addChannelFromSettings, toggleConnectAllChat,
  renderSettingsChannels,
} from './plataformas.js';
import { doInstallUpdate, iniciarEventosElectron } from './eventos-electron.js';
import {
  musicRemoveFromQueue, musicSkip, musicTogglePause, musicSetEnabled, musicSetVolume,
  musicSaveCooldown, musicSaveMaxQueue, musicClearQueue, musicBanUser, musicUnbanUser,
  playlistSave, playlistSetEnabled, playlistSetShuffle, playlistPlay, musicInit,
  updatePlaylistInfo,
} from './bot-musica.js';
import {
  modPage, modSetTab, modOnSearch, modWipe, checkModWipeConfirmInput, closeModWipeConfirm,
  confirmModWipe, openBlockWordModal, closeBlockWordModal, submitBlockWord,
  iniciarMenusModeracion,
} from './moderacion.js';
import {
  startModerationTour, startSoundpadTour, startBotTour, startPluginStoreTour,
  startChatActionsTour, startClipsTour, startOverlaysTour, startVoiceTour,
  startShortcutsTour, startTwitchTour,
} from './tours/index.js';

// ─── Puente onclick/onchange/oninput: el markup los invoca como globales ──
Object.assign(window, {
  // i18n — t/tErr los necesitan ademas los scripts clasicos de
  // plugin-store/*.js (no son modulos ES; antes t() vivia en scope global
  // porque el script viejo tampoco lo era)
  pickLanguage, setLanguage, t, tErr,
  // vistas
  switchView,
  // utils
  copyToClipboard,
  // fondo de overlays
  uploadBg, removeBg,
  // configurador de overlays
  onCfgChange, onChatPlatformChange, copyCfgUrl, testGiftAlert, testSocialAlert,
  testAlertType, copySocialAlertUrl, testTopLikers,
  // oauth twitch
  saveTwitchClientId, connectTwitchAuth, disconnectTwitchAuth,
  // toggles de chat
  toggleChatToggles, toggleTwitchSection, toggleOption, setSoloChatMode,
  // atajos de teclado
  startCapturingShortcut, clearTtsShortcut, applyTtsShortcutPreset,
  // config runtime
  setReadNonFollowers,
  // voces
  toggleVoiceDropdown, toggleLangFilter, toggleDictFilter, toggleSayUsernameConnector,
  selectVoice, testVoice,
  // chat / tts
  clearChat, skipCurrentTTS, clearTTSQueue, togglePauseTts, toggleGlobalTTS,
  enableEmergencyTTSMode, updateRate, updateVol,
  // modales y avisos
  openDonationsModal, closeDonationsModal, openSocialModal, closeSocialModal,
  openBugReportModal, closeBugReportModal, submitBugReport, openDictLangModal,
  closeDictLangModal, closeDonationNotice, openDonationsFromNotice, closeBugReportNotice,
  openBugReportFromNotice, closeOnboardingWelcome, closeOnboardingComplete, startOnboardingTour,
  // movil remoto
  copyMobileURL, refreshMobileQR,
  // clips / obs
  markClip, clearAllClips, startStreamManual, stopStream, connectOBSFromUI, disconnectOBSFromUI,
  // soundpad
  spPlaySoundWithAnim, spCardMenu, spPlayTestSound, spUploadTrigger, spHandleUpload,
  spCloseSettings, spSetSaveName, spSetSaveColor, spSettingsCapture, spSettingsClearShortcut,
  spSettingsDelete, spFilterIcons, spChooseIcon,
  // plataformas
  toggleAddChannelForm, selectAddPlatform, addChannelFromSettings, toggleConnectAllChat,
  // auto-update
  doInstallUpdate,
  // musica
  musicRemoveFromQueue, musicSkip, musicTogglePause, musicSetEnabled, musicSetVolume,
  musicSaveCooldown, musicSaveMaxQueue, musicClearQueue, musicBanUser, musicUnbanUser,
  playlistSave, playlistSetEnabled, playlistSetShuffle, playlistPlay,
  // moderacion / bloqueo de palabras
  modPage, modSetTab, modOnSearch, modWipe, checkModWipeConfirmInput, closeModWipeConfirm,
  confirmModWipe, openBlockWordModal, closeBlockWordModal, submitBlockWord,
  // tours
  startModerationTour, startSoundpadTour, startBotTour, startPluginStoreTour,
  startChatActionsTour, startClipsTour, startOverlaysTour, startVoiceTour,
  startShortcutsTour, startTwitchTour,
  // usadas por markup construido en JS (template strings con onclick="...")
  escapeHtml,
});

function iniciarArranque() {
  iniciarRotacionAnuncioLateral();
  iniciarCapturaErroresCliente();
  iniciarI18nApp();
  iniciarModalesYAvisos();
  iniciarMenusModeracion();
  iniciarObservadorTogglesChat();
  iniciarAtajosTeclado();
  iniciarCierreDropdownVoces();
  iniciarPintadoDeRangos();

  document.addEventListener('DOMContentLoaded', () => {
    initChatScrollFollow();
    document.querySelectorAll('.cfg-field input[type="range"], #rateRange, #volRange').forEach(paintRangeFill);
  });

  // ─── INIT (mismo orden que el original) ──────────────────────
  loadSettings();
  applySettings();
  loadRuntimeConfig();
  renderShortcutDisplay();
  if (window.electronAPI?.registerTtsShortcut) {
    for (const action of TTS_SHORTCUT_ACTIONS_KEYS) {
      const settingKey = { pause: 'pauseShortcut', skip: 'skipShortcut', clear: 'clearShortcut', musicPause: 'musicPauseShortcut', musicSkip: 'musicSkipShortcut' }[action];
      if (appSettings[settingKey]) registerTtsShortcut(action, appSettings[settingKey], { silent: true });
    }
  }
  loadVoices();
  connectWS();
  updateQueueBadge();
  renderSettingsChannels();
  loadMobileURL();
  loadPlatformConfigUI();
  loadOAuthStatusUI();
  spLoad().then(() => spRestoreShortcuts());

  fetch('/api/overlay-stats')
    .then((r) => r.json())
    .then((d) => { if (d.baseFollowerCount) updateFollowerDisplay(d.baseFollowerCount); })
    .catch(() => {});

  iniciarEventosElectron();
  musicInit();
}

iniciarArranque();
