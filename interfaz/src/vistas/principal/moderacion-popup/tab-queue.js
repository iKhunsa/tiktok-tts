import { t, aplicarTraducciones } from '../../../nucleo/i18n/i18n.js';
import { getQueueStats } from '../../../nucleo/tts/cola-tts.js';

export function mountQueueTab(panel) {
  panel.innerHTML = `
    <p class="mp-hint" data-i18n="modPopup.queue.explain"></p>
    <dl class="mp-stats">
      <div><dt data-i18n="modPopup.queue.dropped"></dt><dd class="mp-stat-dropped"></dd></div>
      <div><dt data-i18n="modPopup.queue.waiting"></dt><dd class="mp-stat-waiting"></dd></div>
    </dl>
    <p class="mp-hint" data-i18n="modPopup.queue.tip"></p>`;
  aplicarTraducciones(panel);

  function render() {
    const stats = getQueueStats();
    panel.querySelector('.mp-stat-dropped').textContent = String(stats.dropped);
    panel.querySelector('.mp-stat-waiting').textContent = t('modPopup.queue.waitingValue', { n: stats.waiting, max: stats.max });
  }
  render();
  return { refresh: render };
}
