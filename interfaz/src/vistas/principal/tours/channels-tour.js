import { t } from '../../../nucleo/i18n/i18n.js';
import { driverTourDefaults } from '../../../nucleo/tours/driver.js';
import { switchView } from '../vistas-router.js';
import { toggleAddChannelForm, selectAddPlatform } from '../plataformas.js';

export function startChannelsTour() {
  if (!(window.driver && window.driver.js)) return;
  switchView('settings');
  const form = document.getElementById('add-channel-form');
  const openedForTour = form?.style.display !== 'flex';
  if (openedForTour) toggleAddChannelForm();
  const inSettings = () => switchView('settings');

  // El input de @usuario y el boton Guardar quedan ocultos cuando platform=tiktok
  // y no hay sesion (ver toggleTiktokAddPrompt en tiktok-sesion.js) — si el tour
  // los apunta en ese estado, driver.js no encuentra un elemento visible y el
  // popover se va a la esquina. Forzar Twitch antes de esos 2 pasos los deja
  // siempre visibles sin importar si el usuario esta logueado en TikTok o no.
  const ensureInputVisible = () => selectAddPlatform('twitch');

  const steps = [
    { element: '#settingsSectionChannels .settings-section-title', popover: { title: t('channelsTour.introTitle'), description: t('channelsTour.introDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: inSettings },
    { element: '#settings-channels-list', popover: { title: t('channelsTour.listTitle'), description: t('channelsTour.listDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: inSettings },
    { element: '#btn-toggle-add-channel', popover: { title: t('channelsTour.addTitle'), description: t('channelsTour.addDesc'), side: 'bottom', align: 'end' }, onHighlightStarted: inSettings },
    { element: '#platform-seg', popover: { title: t('channelsTour.platformTitle'), description: t('channelsTour.platformDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: () => { inSettings(); selectAddPlatform('tiktok'); } },
  ];

  // Paso del login de TikTok: solo tiene sentido (y solo hay un elemento
  // visible que apuntar) cuando el prompt de login esta activo, o sea sin
  // sesion todavia. Con sesion iniciada (o el paquete viejo, sin soporte de
  // sesion) se salta directo al paso de escribir el canal.
  if (document.getElementById('tiktok-login-prompt')?.style.display === 'flex') {
    steps.push({
      element: '#tiktok-login-prompt',
      popover: { title: t('channelsTour.tiktokLoginTitle'), description: t('channelsTour.tiktokLoginDesc'), side: 'bottom', align: 'start' },
      onHighlightStarted: () => { inSettings(); selectAddPlatform('tiktok'); },
    });
  }

  steps.push(
    { element: '#add-channel-input', popover: { title: t('channelsTour.channelTitle'), description: t('channelsTour.channelDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: () => { inSettings(); ensureInputVisible(); } },
    { element: '#btn-add-channel', popover: { title: t('channelsTour.saveTitle'), description: t('channelsTour.saveDesc'), side: 'bottom', align: 'end' }, onHighlightStarted: () => { inSettings(); ensureInputVisible(); } },
    { element: '#btn-connect-all-chat', popover: { title: t('channelsTour.connectTitle'), description: t('channelsTour.connectDesc'), side: 'bottom', align: 'end' }, onHighlightStarted: () => switchView('chat') },
  );

  window.driver.js.driver({
    ...driverTourDefaults(),
    steps,
    onDestroyed: () => { if (openedForTour && form?.style.display === 'flex') toggleAddChannelForm(); },
  }).drive();
}
