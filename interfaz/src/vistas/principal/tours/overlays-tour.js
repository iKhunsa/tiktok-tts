import { t } from '../../../nucleo/i18n/i18n.js';
import { driverTourDefaults } from '../../../nucleo/tours/driver.js';
import { switchView } from '../vistas-router.js';

export function startOverlaysTour() {
  if (!(window.driver && window.driver.js)) return;
  const inOverlays = () => switchView('overlays');

  window.driver.js.driver({
    ...driverTourDefaults(),
    steps: [
      { element: '#view-overlays .view-header', popover: { title: t('overlaysTour.introTitle'), description: t('overlaysTour.introDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: inOverlays },
      { element: '#cfg-url-chat', popover: { title: t('overlay.chat.title'), description: t('overlaysTour.urlDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: inOverlays },
      { element: '#cfg-url-seguidores', popover: { title: t('overlay.followers.title'), description: t('overlaysTour.urlDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: inOverlays },
      { element: '#cfg-url-likes', popover: { title: t('overlay.topLikers.title'), description: t('overlaysTour.urlDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: inOverlays },
      { element: '#cfg-url-alertas', popover: { title: t('overlay2.giftsTitle'), description: t('overlaysTour.urlDesc'), side: 'top', align: 'start' }, onHighlightStarted: inOverlays },
      { element: '#cfg-alertas-bgimg', popover: { title: t('overlaysTour.bgTitle'), description: t('overlaysTour.bgDesc'), side: 'top', align: 'start' }, onHighlightStarted: inOverlays },
      { element: '[onclick="testGiftAlert()"]', popover: { title: t('overlaysTour.testTitle'), description: t('overlaysTour.testDesc'), side: 'top', align: 'end' }, onHighlightStarted: inOverlays },
    ],
  }).drive();
}
