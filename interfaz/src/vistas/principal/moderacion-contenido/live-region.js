import { t } from '../../../nucleo/i18n/i18n.js';

// Anuncia para lectores de pantalla ("Palabra quitada", "Nivel cambiado a ...").
export function mountLiveRegion(container, { store }) {
  container.setAttribute('aria-live', 'polite');
  container.setAttribute('aria-atomic', 'true');
  let lastCount = 0;

  function render({ announce }) {
    if (!announce || announce.count === lastCount) return;
    lastCount = announce.count;
    container.textContent = t(announce.key, announce.labelKey ? { level: t(announce.labelKey) } : undefined);
  }

  return store.subscribe(render);
}
