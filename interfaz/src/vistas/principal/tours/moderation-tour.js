import { t } from '../../../nucleo/i18n/i18n.js';
import { driverTourDefaults } from '../../../nucleo/tours/driver.js';
import { switchView } from '../vistas-router.js';

export function startModerationTour() {
  if (!(window.driver && window.driver.js)) return;
  const inModeration = () => switchView('moderacion');
  const inChat = () => switchView('chat');

  window.driver.js.driver({
    ...driverTourDefaults(),
    steps: [
      { element: '#view-moderacion .view-header', popover: { title: t('modTour.introTitle'), description: t('modTour.introDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: inModeration },
      { element: '.mod-tabs', popover: { title: t('modTour.tabsTitle'), description: t('modTour.tabsDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: inModeration },
      { element: '.mod-filters', popover: { title: t('modTour.filtersTitle'), description: t('modTour.filtersDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: inModeration },
      { element: '#modStats', popover: { title: t('modTour.statsTitle'), description: t('modTour.statsDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: inModeration },
      { element: '.mod-table-wrap', popover: { title: t('modTour.tableTitle'), description: t('modTour.tableDesc'), side: 'top', align: 'start' }, onHighlightStarted: inModeration },
      { element: '#btnBlockedWordsShortcut', popover: { title: t('modTour.blockedTitle'), description: t('modTour.blockedDesc'), side: 'bottom', align: 'end' }, onHighlightStarted: inChat },
    ],
  }).drive();
}
