import { t } from '../../../nucleo/i18n/i18n.js';
import { driverTourDefaults } from '../../../nucleo/tours/driver.js';
import { switchView } from '../vistas-router.js';
import { modMostrarAjustes } from '../moderacion.js';
import { trackUi } from '../../../nucleo/telemetria-ui.js';

export function startModerationTour() {
  trackUi('ui:tour-started', 'moderacion');
  if (!(window.driver && window.driver.js)) return;
  // Los pasos de la tabla la necesitan visible; los del filtro, el panel abierto.
  const inModeration = () => { switchView('moderacion'); modMostrarAjustes(false); };
  const inChatGuard = () => { switchView('moderacion'); modMostrarAjustes(true); };
  const inChat = () => switchView('chat');

  window.driver.js.driver({
    ...driverTourDefaults(),
    steps: [
      { element: '#view-moderacion .view-header', popover: { title: t('modTour.introTitle'), description: t('modTour.introDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: inModeration },
      { element: '.mod-tabs', popover: { title: t('modTour.tabsTitle'), description: t('modTour.tabsDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: inModeration },
      { element: '.mod-filters', popover: { title: t('modTour.filtersTitle'), description: t('modTour.filtersDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: inModeration },
      { element: '#modStats', popover: { title: t('modTour.statsTitle'), description: t('modTour.statsDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: inModeration },
      { element: '.mod-table-wrap', popover: { title: t('modTour.tableTitle'), description: t('modTour.tableDesc'), side: 'top', align: 'start' }, onHighlightStarted: inModeration },
      { element: '#modBtnAjustes', popover: { title: t('modTour.settingsTitle'), description: t('modTour.settingsDesc'), side: 'bottom', align: 'end' }, onHighlightStarted: inModeration },
      { element: '#cgMaster', popover: { title: t('modTour.cgFilterTitle'), description: t('modTour.cgFilterDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: inChatGuard },
      { element: '#cgLevel', popover: { title: t('modTour.cgLevelTitle'), description: t('modTour.cgLevelDesc'), side: 'top', align: 'start' }, onHighlightStarted: inChatGuard },
      { element: '#cgWords', popover: { title: t('modTour.cgWordsTitle'), description: t('modTour.cgWordsDesc'), side: 'top', align: 'start' }, onHighlightStarted: inChatGuard },
      { element: '#btnBlockedWordsShortcut', popover: { title: t('modTour.blockedTitle'), description: t('modTour.blockedDesc'), side: 'bottom', align: 'end' }, onHighlightStarted: inChat },
    ],
  }).drive();
}
