import { t } from '../../../nucleo/i18n/i18n.js';
import { driverTourDefaults } from '../../../nucleo/tours/driver.js';
import { switchView } from '../vistas-router.js';

export function startBotTour() {
  if (!(window.driver && window.driver.js)) return;
  const inBot = () => switchView('bot');

  window.driver.js.driver({
    ...driverTourDefaults(),
    steps: [
      { element: '#view-bot .view-header', popover: { title: t('botTour.introTitle'), description: t('botTour.introDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: inBot },
      { element: '#music-now-playing-card', popover: { title: t('botTour.nowPlayingTitle'), description: t('botTour.nowPlayingDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: inBot },
      { element: '#music-queue-list', popover: { title: t('botTour.queueTitle'), description: t('botTour.queueDesc'), side: 'top', align: 'start' }, onHighlightStarted: inBot },
      { element: '#music-bot-settings', popover: { title: t('botTour.settingsTitle'), description: t('botTour.settingsDesc'), side: 'top', align: 'start' }, onHighlightStarted: inBot },
      { element: '#music-playlist-card', popover: { title: t('botTour.playlistTitle'), description: t('botTour.playlistDesc'), side: 'top', align: 'start' }, onHighlightStarted: inBot },
    ],
  }).drive();
}
