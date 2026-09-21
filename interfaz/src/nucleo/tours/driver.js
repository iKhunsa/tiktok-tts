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

export function startSectionTour(element) {
  if (!element || !element.isConnected || !(window.driver && window.driver.js)) return;
  window.driver.js.driver({
    ...driverTourDefaults(),
    steps: [{
      element,
      popover: { title: t('tour.sectionTitle'), description: t('tour.sectionDesc'), side: 'bottom', align: 'start' },
    }],
  }).drive();
}

export function addSectionTutorials({ selector, buttonClass }) {
  document.querySelectorAll(selector).forEach((section) => {
    if (section.querySelector('[data-section-tutorial], .cfg-btn')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = buttonClass;
    button.dataset.sectionTutorial = '';
    button.innerHTML = '<img class="icon-inline" src="icons/help_outline.svg" alt=""> <span data-i18n="tour.viewTutorial"></span>';
    button.querySelector('span').textContent = t('tour.viewTutorial');
    button.addEventListener('click', () => startSectionTour(section));
    section.append(button);
  });
}
