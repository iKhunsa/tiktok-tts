/**
 * Los 10 tours guiados (driver.js) de la app. Portados 1:1; `showPluginGrid`/
 * `renderPluginDetail` siguen siendo globals de window (plugin-store/*.js
 * son scripts clasicos, no modulos ESM — no se tocaron en esta migracion).
 */
import { t } from '../../../nucleo/i18n/i18n.js';
import { switchView } from '../vistas-router.js';
import { expandChatToggles, expandTwitchSection } from '../toggles-chat.js';
import { closeDictLangModal, openDictLangModal } from '../modales-avisos.js';

export function driverTourDefaults() {
  return {
    showProgress: true,
    allowClose: true,
    overlayOpacity: 0.65,
    stagePadding: 6,
    popoverOffset: 12,
    nextBtnText: t('tour.next'),
    prevBtnText: t('tour.prev'),
    doneBtnText: t('tour.done'),
    progressText: '{{current}}/{{total}}',
  };
}

export function startModerationTour() {
  if (!(window.driver && window.driver.js)) return;
  const inModeration = () => switchView('moderacion');
  const inChat = () => { switchView('chat'); expandChatToggles(); };

  window.driver.js.driver({
    ...driverTourDefaults(),
    steps: [
      { element: '#view-moderacion .view-header', popover: { title: t('modTour.introTitle'), description: t('modTour.introDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: inModeration },
      { element: '.mod-tabs', popover: { title: t('modTour.tabsTitle'), description: t('modTour.tabsDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: inModeration },
      { element: '#modStats', popover: { title: t('modTour.statsTitle'), description: t('modTour.statsDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: inModeration },
      { element: '.mod-filters', popover: { title: t('modTour.filtersTitle'), description: t('modTour.filtersDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: inModeration },
      { element: '.mod-table-wrap', popover: { title: t('modTour.tableTitle'), description: t('modTour.tableDesc'), side: 'top', align: 'start' }, onHighlightStarted: inModeration },
      { element: '#chatLog', popover: { title: t('modTour.chatMenuTitle'), description: t('modTour.chatMenuDesc'), side: 'top', align: 'start' }, onHighlightStarted: inChat },
      { element: '.chat-header', popover: { title: t('modTour.scrollTitle'), description: t('modTour.scrollDesc'), side: 'top', align: 'start' }, onHighlightStarted: inChat },
      { element: '#chip-nonfollowers', popover: { title: t('modTour.toggleTitle'), description: t('modTour.toggleDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: inChat },
      { element: '#btnBlockedWordsShortcut', popover: { title: t('modTour.blockedTitle'), description: t('modTour.blockedDesc'), side: 'bottom', align: 'end' }, onHighlightStarted: inChat },
    ],
  }).drive();
}

export function startSoundpadTour() {
  if (!(window.driver && window.driver.js)) return;
  const inSoundpad = () => switchView('soundpad');

  window.driver.js.driver({
    ...driverTourDefaults(),
    steps: [
      { element: '#view-soundpad .view-header', popover: { title: t('soundTour.introTitle'), description: t('soundTour.introDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: inSoundpad },
      { element: '#spUploadBtn', popover: { title: t('soundTour.uploadTitle'), description: t('soundTour.uploadDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: inSoundpad },
      { element: '#view-soundpad .cfg-card', popover: { title: t('soundTour.deckTitle'), description: t('soundTour.deckDesc'), side: 'top', align: 'start' }, onHighlightStarted: inSoundpad },
      { element: '#view-soundpad .cfg-card', popover: { title: t('soundTour.shortcutTitle'), description: t('soundTour.shortcutDesc'), side: 'top', align: 'start' }, onHighlightStarted: inSoundpad },
      { element: '#view-soundpad .btn-test', popover: { title: t('soundTour.testTitle'), description: t('soundTour.testDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: inSoundpad },
      { element: '#spCount', popover: { title: t('soundTour.limitTitle'), description: t('soundTour.limitDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: inSoundpad },
    ],
  }).drive();
}

export function startBotTour() {
  if (!(window.driver && window.driver.js)) return;
  const inBot = () => switchView('bot');

  window.driver.js.driver({
    ...driverTourDefaults(),
    steps: [
      { element: '#view-bot .view-header', popover: { title: t('botTour.introTitle'), description: t('botTour.introDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: inBot },
      { element: '#music-now-playing-card', popover: { title: t('botTour.nowPlayingTitle'), description: t('botTour.nowPlayingDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: inBot },
      { element: '#music-queue-list', popover: { title: t('botTour.queueTitle'), description: t('botTour.queueDesc'), side: 'top', align: 'start' }, onHighlightStarted: inBot },
      { element: '#playlistTextarea', popover: { title: t('botTour.playlistTitle'), description: t('botTour.playlistDesc'), side: 'top', align: 'start' }, onHighlightStarted: inBot },
      { element: '#musicBanInput', popover: { title: t('botTour.settingsTitle'), description: t('botTour.settingsDesc'), side: 'top', align: 'start' }, onHighlightStarted: inBot },
    ],
  }).drive();
}

export function startPluginStoreTour() {
  if (!(window.driver && window.driver.js)) return;

  // driver.js resuelve el elemento del paso ANTES de llamar a
  // onHighlightStarted y posiciona el popover con esa referencia. Si el
  // callback reconstruye el innerHTML del panel (como hacen
  // renderPluginGrid/renderPluginDetail), el nodo ya medido queda
  // desanclado del DOM y el popover se descoloca. Por eso los pasos solo
  // togglean display en los contenedores; el contenido se renderiza una
  // sola vez, antes de arrancar el tour.
  const showGridPanel = () => {
    const grid = document.getElementById('pluginStoreGrid');
    const detail = document.getElementById('pluginStoreDetail');
    const header = document.getElementById('pluginStoreHeader');
    if (detail) detail.style.display = 'none';
    if (grid) grid.style.display = '';
    if (header) header.style.display = '';
  };
  const showDetailPanel = () => {
    const grid = document.getElementById('pluginStoreGrid');
    const detail = document.getElementById('pluginStoreDetail');
    const header = document.getElementById('pluginStoreHeader');
    if (grid) grid.style.display = 'none';
    if (detail) detail.style.display = '';
    if (header) header.style.display = 'none';
  };
  window.showPluginGrid();
  window.renderPluginDetail('overlays');

  window.driver.js.driver({
    ...driverTourDefaults(),
    steps: [
      { element: '#pluginStoreHeader', popover: { title: t('pluginStoreTour.introTitle'), description: t('pluginStoreTour.introDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: showGridPanel },
      { element: '#pluginStoreGrid', popover: { title: t('pluginStoreTour.gridTitle'), description: t('pluginStoreTour.gridDesc'), side: 'top', align: 'start' }, onHighlightStarted: showGridPanel },
      { element: '.store-card[data-tool-id="overlays"]', popover: { title: t('pluginStoreTour.dragTitle'), description: t('pluginStoreTour.dragDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: showGridPanel },
      { element: '.store-detail-media', popover: { title: t('pluginStoreTour.mediaTitle'), description: t('pluginStoreTour.mediaDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: showDetailPanel },
      { element: '.store-detail-header', popover: { title: t('pluginStoreTour.headerTitle'), description: t('pluginStoreTour.headerDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: showDetailPanel },
      { element: '.store-detail-actions', popover: { title: t('pluginStoreTour.actionsTitle'), description: t('pluginStoreTour.actionsDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: showDetailPanel },
      { element: '.store-detail-about', popover: { title: t('pluginStoreTour.aboutTitle'), description: t('pluginStoreTour.aboutDesc'), side: 'top', align: 'start' }, onHighlightStarted: showDetailPanel },
    ],
    onDestroyed: showGridPanel,
  }).drive();
}

export function startChatActionsTour() {
  if (!(window.driver && window.driver.js)) return;
  const inChatActions = () => { switchView('chat'); expandChatToggles(); };

  window.driver.js.driver({
    ...driverTourDefaults(),
    steps: [
      { element: '.toggles-row', popover: { title: t('chatActionsTour.togglesTitle'), description: t('chatActionsTour.togglesDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: inChatActions },
      { element: '#btnTTSToggle', popover: { title: t('chatActionsTour.ttsTitle'), description: t('chatActionsTour.ttsDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: inChatActions },
      { element: 'button[onclick="skipCurrentTTS()"]', popover: { title: t('chatActionsTour.skipTitle'), description: t('chatActionsTour.skipDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: inChatActions },
      { element: 'button[onclick="clearTTSQueue()"]', popover: { title: t('chatActionsTour.queueTitle'), description: t('chatActionsTour.queueDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: inChatActions },
      { element: 'button[onclick="enableEmergencyTTSMode()"]', popover: { title: t('chatActionsTour.emergencyTitle'), description: t('chatActionsTour.emergencyDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: inChatActions },
      { element: 'button[onclick="clearChat()"]', popover: { title: t('chatActionsTour.clearTitle'), description: t('chatActionsTour.clearDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: inChatActions },
      { element: '#btnBlockedWordsShortcut', popover: { title: t('chatActionsTour.blockedTitle'), description: t('chatActionsTour.blockedDesc'), side: 'bottom', align: 'end' }, onHighlightStarted: inChatActions },
      { element: '#btn-connect-all-chat', popover: { title: t('chatActionsTour.connectTitle'), description: t('chatActionsTour.connectDesc'), side: 'bottom', align: 'end' }, onHighlightStarted: inChatActions },
      { element: '#chatLog', popover: { title: t('chatActionsTour.logTitle'), description: t('chatActionsTour.logDesc'), side: 'top', align: 'start' }, onHighlightStarted: inChatActions },
    ],
  }).drive();
}

export function startClipsTour() {
  if (!(window.driver && window.driver.js)) return;
  const inClips = () => switchView('clips');

  window.driver.js.driver({
    ...driverTourDefaults(),
    steps: [
      { element: '#view-clips .view-header', popover: { title: t('clipsTour.introTitle'), description: t('clipsTour.introDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: inClips },
      { element: '#btnStartStream', popover: { title: t('clipsTour.startTitle'), description: t('clipsTour.startDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: inClips },
      { element: '#btnMarkClip', popover: { title: t('clipsTour.markTitle'), description: t('clipsTour.markDesc'), side: 'top', align: 'start' }, onHighlightStarted: inClips },
      { element: '#obsStatusDot', popover: { title: t('clipsTour.obsTitle'), description: t('clipsTour.obsDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: inClips },
      { element: '#clipsHistory', popover: { title: t('clipsTour.historyTitle'), description: t('clipsTour.historyDesc'), side: 'top', align: 'start' }, onHighlightStarted: inClips },
    ],
  }).drive();
}

export function startOverlaysTour() {
  if (!(window.driver && window.driver.js)) return;
  const inOverlays = () => switchView('overlays');

  window.driver.js.driver({
    ...driverTourDefaults(),
    steps: [
      { element: '#view-overlays .view-header', popover: { title: t('overlaysTour.introTitle'), description: t('overlaysTour.introDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: inOverlays },
      { element: '#cfg-url-chat', popover: { title: t('overlaysTour.urlTitle'), description: t('overlaysTour.urlDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: inOverlays },
      { element: '[onclick="copyCfgUrl(\'chat\')"]', popover: { title: t('overlaysTour.copyTitle'), description: t('overlaysTour.copyDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: inOverlays },
      { element: '#view-overlays .cfg-card:nth-of-type(1) .cfg-fields', popover: { title: t('overlaysTour.customizeTitle'), description: t('overlaysTour.customizeDesc'), side: 'top', align: 'start' }, onHighlightStarted: inOverlays },
      { element: '#view-overlays .cfg-card:nth-of-type(1) .bg-upload-row', popover: { title: t('overlaysTour.bgTitle'), description: t('overlaysTour.bgDesc'), side: 'top', align: 'start' }, onHighlightStarted: inOverlays },
      { element: '[onclick="testGiftAlert()"]', popover: { title: t('overlaysTour.testTitle'), description: t('overlaysTour.testDesc'), side: 'top', align: 'end' }, onHighlightStarted: inOverlays },
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
      { element: '#voiceLangFilterGroup', popover: { title: t('voiceTour.charFilterTitle'), description: t('voiceTour.charFilterDesc'), side: 'top', align: 'start' }, onHighlightStarted: inSettings },
      { element: '#voiceDictFilterGroup', popover: { title: t('voiceTour.wordFilterTitle'), description: t('voiceTour.wordFilterDesc'), side: 'top', align: 'start' }, onHighlightStarted: inSettings },
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

export function startTwitchTour() {
  if (!(window.driver && window.driver.js)) return;
  expandTwitchSection();
  const inSettings = () => switchView('settings');

  window.driver.js.driver({
    ...driverTourDefaults(),
    steps: [
      { element: '#settingsSectionTwitch .settings-section-title', popover: { title: t('twitchTour.introTitle'), description: t('twitchTour.introDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: inSettings },
      { element: '#twitchClientIdGroup', popover: { title: t('twitchTour.clientIdTitle'), description: t('twitchTour.clientIdDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: inSettings },
      { element: '#twitchConnectRow', popover: { title: t('twitchTour.connectTitle'), description: t('twitchTour.connectDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: inSettings },
      { element: '#twitchTogglesRow', popover: { title: t('twitchTour.togglesTitle'), description: t('twitchTour.togglesDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: inSettings },
      { element: '#twitchTestRow', popover: { title: t('twitchTour.testTitle'), description: t('twitchTour.testDesc'), side: 'top', align: 'start' }, onHighlightStarted: inSettings },
    ],
  }).drive();
}
