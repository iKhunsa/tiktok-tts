import { t, aplicarTraducciones } from '../../../nucleo/i18n/i18n.js';

// Cada estado dice lo mismo con icono + texto (no solo color).
function describeEngine(state) {
  if (state.phase === 'loading') return { icon: 'sync', text: 'chatGuard.status.loading', spinning: true };
  if (state.phase === 'error') return { icon: 'error-red', text: 'chatGuard.status.loadError', alert: true, retry: true };
  const { status } = state;
  if (status.state === 'off') return { icon: 'report_off', text: 'chatGuard.status.off' };
  if (status.state === 'unavailable') return { icon: 'warning-amber', text: 'chatGuard.status.unavailable' };
  if (status.state === 'error') return { icon: 'error-red', text: 'chatGuard.status.error', alert: true };
  return { icon: 'check-circle-green', text: status.mode === 'enforce' ? 'chatGuard.status.okEnforce' : 'chatGuard.status.okShadow' };
}

function versionsText(status) {
  if (!status || !status.engineVersion || !status.dictionaryVersion) return '';
  return t('chatGuard.status.versions', { engine: status.engineVersion, dict: status.dictionaryVersion });
}

export function mountEngineStatus(container, { store, actions }) {
  container.innerHTML = `
    <div class="cg-subtitle" data-i18n="chatGuard.status.title"></div>
    <div class="cg-status">
      <img class="icon-inline cg-status-icon" src="icons/sync.svg" alt="">
      <div class="cg-status-body">
        <div class="cg-status-text"></div>
        <div class="cg-hint cg-status-versions"></div>
      </div>
      <button type="button" class="cfg-btn small cg-retry" hidden><img class="icon-inline" src="icons/refresh.svg" alt=""><span data-i18n="chatGuard.status.retry"></span></button>
    </div>`;
  aplicarTraducciones(container);

  const box = container.querySelector('.cg-status');
  const icon = container.querySelector('.cg-status-icon');
  const text = container.querySelector('.cg-status-text');
  const versions = container.querySelector('.cg-status-versions');
  const retry = container.querySelector('.cg-retry');
  retry.addEventListener('click', () => actions.load());

  function render(state) {
    const view = describeEngine(state);
    box.setAttribute('role', view.alert ? 'alert' : 'status');
    icon.src = `icons/${view.icon}.svg`;
    icon.classList.toggle('is-spinning', Boolean(view.spinning));
    text.textContent = t(view.text);
    versions.textContent = versionsText(state.status);
    versions.hidden = !versions.textContent;
    retry.hidden = !view.retry;
  }

  render(store.getState());
  return store.subscribe(render);
}
