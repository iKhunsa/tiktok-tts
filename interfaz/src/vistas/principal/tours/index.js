/**
 * Los 10 tours guiados (driver.js) de la app. Portados 1:1; `showPluginGrid`/
 * `renderPluginDetail` siguen siendo globals de window (plugin-store/*.js
 * son scripts clasicos, no modulos ESM — no se tocaron en esta migracion).
 */
import { t } from '../../../nucleo/i18n/i18n.js';
import { driverTourDefaults as sharedDriverTourDefaults, addSectionTutorials } from '../../../nucleo/tours/driver.js';
import { switchView } from '../vistas-router.js';
import { expandChatToggles } from '../toggles-chat.js';
import { closeDictLangModal, openDictLangModal } from '../modales-avisos.js';
export { startChannelsTour } from './channels-tour.js';

export { startBotTour } from './music-bot-tour.js';
export { startSoundpadTour } from './soundpad-tour.js';
export { startClipsTour } from './clips-tour.js';
export { startModerationTour } from './moderation-tour.js';
export { startOverlaysTour } from './overlays-tour.js';
export { startPluginStoreTour } from './plugin-store-tour.js';

export function driverTourDefaults() {
  return sharedDriverTourDefaults();
}

export function iniciarTutorialesDeSeccion() {
  addSectionTutorials({
    selector: '.view-header, .settings-section-title',
    buttonClass: 'cfg-btn',
  });
}




export function startChatActionsTour() {
  if (!(window.driver && window.driver.js)) return;
  const inChatActions = () => { switchView('chat'); expandChatToggles(); };

  window.driver.js.driver({
    ...driverTourDefaults(),
    steps: [
      { element: '#btnTTSToggle', popover: { title: t('chatActionsTour.ttsTitle'), description: t('chatActionsTour.ttsDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: inChatActions },
      { element: '#chatTogglesBox', popover: { title: t('chatActionsTour.togglesTitle'), description: t('chatActionsTour.togglesDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: inChatActions },
      { element: 'button[onclick="clearChatAndQueue()"]', popover: { title: t('chatActionsTour.clearTitle'), description: t('chatActionsTour.clearDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: inChatActions },
      { element: '#btnBlockedWordsShortcut', popover: { title: t('chatActionsTour.blockedTitle'), description: t('chatActionsTour.blockedDesc'), side: 'bottom', align: 'end' }, onHighlightStarted: inChatActions },
      { element: '#btn-connect-all-chat', popover: { title: t('chatActionsTour.connectTitle'), description: t('chatActionsTour.connectDesc'), side: 'bottom', align: 'end' }, onHighlightStarted: inChatActions },
      { element: '#chatLog', popover: { title: t('chatActionsTour.logTitle'), description: t('chatActionsTour.logDesc'), side: 'top', align: 'start' }, onHighlightStarted: inChatActions },
      { element: '#speakingGoto', popover: { title: t('tour.speakingNowTitle'), description: t('tour.speakingNowDesc'), side: 'top', align: 'start' }, onHighlightStarted: inChatActions },
    ],
  }).drive();
}



export function startVoiceTour() {
  if (!(window.driver && window.driver.js)) return;
  const inSettings = () => switchView('settings');

  window.driver.js.driver({
    ...driverTourDefaults(),
    onDestroyStarted: (element, step, opts) => {
      closeDictLangModal();
      opts.driver.destroy();
    },
    steps: [
      { element: '#settingsSectionVoice .settings-section-title', popover: { title: t('voiceTour.introTitle'), description: t('voiceTour.introDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: inSettings },
      { element: '#voiceSelectGroup', popover: { title: t('voiceTour.voiceTitle'), description: t('voiceTour.voiceDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: inSettings },
      { element: '#voiceTestGroup', popover: { title: t('voiceTour.testTitle'), description: t('voiceTour.testDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: inSettings },
      { element: '#voiceRateGroup', popover: { title: t('voiceTour.rateTitle'), description: t('voiceTour.rateDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: inSettings },
      { element: '#voiceVolGroup', popover: { title: t('voiceTour.volTitle'), description: t('voiceTour.volDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: inSettings },
      { element: '#voiceDictFilterGroup', popover: { title: t('voiceTour.wordFilterTitle'), description: t('voiceTour.wordFilterDesc'), side: 'top', align: 'start' }, onHighlightStarted: inSettings },
      { element: '#announceTplFields', popover: { title: t('tour.announceTitle'), description: t('tour.announceDesc'), side: 'top', align: 'start' }, onHighlightStarted: inSettings },
      { element: '#dictLangModal .modal-content', popover: { title: t('voiceTour.dictModalTitle'), description: t('voiceTour.dictModalDesc'), side: 'left', align: 'start' }, onHighlightStarted: () => { inSettings(); openDictLangModal(); } },
    ],
  }).drive();
}

export function startShortcutsTour() {
  if (!(window.driver && window.driver.js)) return;
  const inSettings = () => switchView('settings');

  window.driver.js.driver({
    ...driverTourDefaults(),
    steps: [
      { element: '#settingsSectionShortcuts .settings-section-title', popover: { title: t('shortcutsTour.introTitle'), description: t('shortcutsTour.introDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: inSettings },
      { element: '#scGroupPauseBtn', popover: { title: t('shortcutsTour.pauseBtnTitle'), description: t('shortcutsTour.pauseBtnDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: inSettings },
      { element: '#scGroupPause', popover: { title: t('shortcutsTour.pauseKeyTitle'), description: t('shortcutsTour.pauseKeyDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: inSettings },
      { element: '#scGroupSkip', popover: { title: t('shortcutsTour.skipTitle'), description: t('shortcutsTour.skipDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: inSettings },
      { element: '#scGroupClear', popover: { title: t('shortcutsTour.clearTitle'), description: t('shortcutsTour.clearDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: inSettings },
      { element: '#scGroupMusicPause', popover: { title: t('shortcutsTour.musicPauseTitle'), description: t('shortcutsTour.musicPauseDesc'), side: 'top', align: 'start' }, onHighlightStarted: inSettings },
      { element: '#scGroupMusicSkip', popover: { title: t('shortcutsTour.musicSkipTitle'), description: t('shortcutsTour.musicSkipDesc'), side: 'top', align: 'start' }, onHighlightStarted: inSettings },
    ],
  }).drive();
}
