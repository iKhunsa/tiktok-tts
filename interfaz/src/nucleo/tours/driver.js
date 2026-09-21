import { t } from '../i18n/i18n.js';

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
