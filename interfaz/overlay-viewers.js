import { cargarLocaleOverlay, aplicarI18nOverlay, idiomaOverlay } from './compartido/i18n-overlay.js';
import { leerParametros, aplicarParametrosVisuales } from './compartido/parametros.js';
import { conectarWSOverlay } from './compartido/ws-cliente.js';
import { iniciarAccesibilidadOverlay } from './compartido/accesibilidad.js';
import { registrarErroresOverlay } from './compartido/registrar-errores.js';

registrarErroresOverlay();
aplicarParametrosVisuales(leerParametros());

let viewerCount = 0;

function render() {
  const count = document.getElementById('viewerCount');
  count.textContent = viewerCount.toLocaleString(idiomaOverlay());
  count.classList.remove('bump');
  void count.offsetWidth;
  count.classList.add('bump');
}

fetch('/api/overlay-stats')
  .then((response) => response.json())
  .then((stats) => { viewerCount = Number(stats.viewerCount) || 0; render(); })
  .catch(() => {});

cargarLocaleOverlay().then(() => {
  aplicarI18nOverlay();
  conectarWSOverlay((message) => {
    if (message.type === 'viewers') {
      viewerCount = Number(message.total) || 0;
      render();
    }
    if (message.type === 'config-updated') aplicarA11y(message.config || {});
  });
});

const aplicarA11y = iniciarAccesibilidadOverlay();
