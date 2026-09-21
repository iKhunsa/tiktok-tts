import { t } from '../../../nucleo/i18n/i18n.js';
import { driverTourDefaults } from '../../../nucleo/tours/driver.js';

export function startPluginStoreTour() {
  if (!(window.driver && window.driver.js)) return;
  const showGridPanel = () => {
    document.getElementById('pluginStoreDetail').style.display = 'none';
    document.getElementById('pluginStoreGrid').style.display = '';
    document.getElementById('pluginStoreHeader').style.display = '';
  };
  const showDetailPanel = () => {
    document.getElementById('pluginStoreGrid').style.display = 'none';
    document.getElementById('pluginStoreDetail').style.display = '';
    document.getElementById('pluginStoreHeader').style.display = 'none';
  };
  window.showPluginGrid();
  window.renderPluginDetail('overlays');

  window.driver.js.driver({
    ...driverTourDefaults(),
    steps: [
      { element: '#pluginStoreHeader', popover: { title: t('pluginStoreTour.introTitle'), description: t('pluginStoreTour.introDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: showGridPanel },
      { element: '#pluginStoreGrid', popover: { title: t('pluginStoreTour.gridTitle'), description: t('pluginStoreTour.gridDesc'), side: 'top', align: 'start' }, onHighlightStarted: showGridPanel },
      { element: '.store-card[data-tool-id="overlays"]', popover: { title: t('pluginStoreTour.dragTitle'), description: t('pluginStoreTour.dragDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: showGridPanel },
      { element: '.store-card-icon-lightbulb', popover: { title: t('store.suggestIdea'), description: t('store.suggestIdeaDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: showGridPanel },
      { element: '.store-detail-actions', popover: { title: t('pluginStoreTour.actionsTitle'), description: t('pluginStoreTour.actionsDesc'), side: 'bottom', align: 'start' }, onHighlightStarted: showDetailPanel },
      { element: '.store-detail-order', popover: { title: t('pluginStoreTour.dragTitle'), description: t('pluginStoreTour.dragDesc'), side: 'top', align: 'start' }, onHighlightStarted: showDetailPanel },
    ],
    onDestroyed: showGridPanel,
  }).drive();
}
