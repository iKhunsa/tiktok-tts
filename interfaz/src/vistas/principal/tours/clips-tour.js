import { t } from '../../../nucleo/i18n/i18n.js';
import { driverTourDefaults } from '../../../nucleo/tours/driver.js';
import { switchView } from '../vistas-router.js';

export function startClipsTour() {
  if (!(window.driver && window.driver.js)) return;
  const inClips = () => switchView('clips');

  window.driver.js.driver({
    ...driverTourDefaults(),
    steps: [
      { element: '#view-clips .view-header', popover: { title: t('clipsTour.introTitle'), description: t('clipsTour.introDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: inClips },
      { element: '#btnStartStream', popover: { title: t('clipsTour.startTitle'), description: t('clipsTour.startDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: inClips },
      { element: '#btnMarkClip', popover: { title: t('clipsTour.markTitle'), description: t('clipsTour.markDesc'), side: 'top', align: 'start' }, onHighlightStarted: inClips },
      { element: '#btnConnectOBS', popover: { title: t('clipsTour.obsTitle'), description: t('clipsTour.obsDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: inClips },
      { element: '#clipsHistory', popover: { title: t('clipsTour.historyTitle'), description: t('clipsTour.historyDesc'), side: 'top', align: 'start' }, onHighlightStarted: inClips },
      { element: '#view-mobile .connect-panel', popover: { title: t('clipsTour.mobileTitle'), description: t('clipsTour.mobileDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: () => switchView('mobile') },
    ],
  }).drive();
}
