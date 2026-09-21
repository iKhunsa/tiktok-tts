import { t } from '../../../nucleo/i18n/i18n.js';
import { driverTourDefaults } from '../../../nucleo/tours/driver.js';
import { switchView } from '../vistas-router.js';
import { toggleAddChannelForm } from '../plataformas.js';

export function startChannelsTour() {
  if (!(window.driver && window.driver.js)) return;
  switchView('settings');
  const form = document.getElementById('add-channel-form');
  const openedForTour = form?.style.display !== 'flex';
  if (openedForTour) toggleAddChannelForm();
  const inSettings = () => switchView('settings');

  window.driver.js.driver({
    ...driverTourDefaults(),
    steps: [
      { element: '#settingsSectionChannels .settings-section-title', popover: { title: t('channelsTour.introTitle'), description: t('channelsTour.introDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: inSettings },
      { element: '#settings-channels-list', popover: { title: t('channelsTour.listTitle'), description: t('channelsTour.listDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: inSettings },
      { element: '#btn-toggle-add-channel', popover: { title: t('channelsTour.addTitle'), description: t('channelsTour.addDesc'), side: 'bottom', align: 'end' }, onHighlightStarted: inSettings },
      { element: '#platform-seg', popover: { title: t('channelsTour.platformTitle'), description: t('channelsTour.platformDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: inSettings },
      { element: '#add-channel-input', popover: { title: t('channelsTour.channelTitle'), description: t('channelsTour.channelDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: inSettings },
      { element: '#btn-add-channel', popover: { title: t('channelsTour.saveTitle'), description: t('channelsTour.saveDesc'), side: 'bottom', align: 'end' }, onHighlightStarted: inSettings },
      { element: '#btn-connect-all-chat', popover: { title: t('channelsTour.connectTitle'), description: t('channelsTour.connectDesc'), side: 'bottom', align: 'end' }, onHighlightStarted: () => switchView('chat') },
    ],
    onDestroyed: () => { if (openedForTour && form?.style.display === 'flex') toggleAddChannelForm(); },
  }).drive();
}
