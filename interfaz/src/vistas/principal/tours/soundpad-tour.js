import { t } from '../../../nucleo/i18n/i18n.js';
import { driverTourDefaults } from '../../../nucleo/tours/driver.js';
import { switchView } from '../vistas-router.js';

export function startSoundpadTour() {
  if (!(window.driver && window.driver.js)) return;
  const inSoundpad = () => switchView('soundpad');

  window.driver.js.driver({
    ...driverTourDefaults(),
    steps: [
      { element: '#view-soundpad .view-header', popover: { title: t('soundTour.introTitle'), description: t('soundTour.introDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: inSoundpad },
      { element: '#spUploadBtn', popover: { title: t('soundTour.uploadTitle'), description: t('soundTour.uploadDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: inSoundpad },
      { element: 'button[onclick="spPlayTestSound()"]', popover: { title: t('soundTour.testTitle'), description: t('soundTour.testDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: inSoundpad },
      { element: '#view-soundpad .cfg-card', popover: { title: t('soundTour.deckTitle'), description: t('soundTour.deckDesc'), side: 'top', align: 'start' }, onHighlightStarted: inSoundpad },
      { element: '#spCount', popover: { title: t('soundTour.limitTitle'), description: t('soundTour.limitDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: inSoundpad },
    ],
  }).drive();
}
