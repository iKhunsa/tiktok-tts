import { cargarLocaleOverlay, aplicarI18nOverlay, idiomaOverlay } from './compartido/i18n-overlay.js';
import { leerParametros, aplicarParametrosVisuales } from './compartido/parametros.js';
import { conectarWSOverlay } from './compartido/ws-cliente.js';
import { iniciarAccesibilidadOverlay } from './compartido/accesibilidad.js';
import { registrarErroresOverlay } from './compartido/registrar-errores.js';
import { esVistaPrevia } from './compartido/vista-previa.js';
import { MUESTRA_VIEWERS } from './compartido/muestras-vista-previa.js';

registrarErroresOverlay();
const params = leerParametros();
aplicarParametrosVisuales(params);

// En la vista previa, sin espectadores reales se muestra una cifra de ejemplo.
const contarEspectadores = (valor) => Number(valor) || (esVistaPrevia(params) ? MUESTRA_VIEWERS : 0);
let viewerCount = contarEspectadores(0);

function render() {
  const count = document.getElementById('viewerCount');
  count.textContent = viewerCount.toLocaleString(idiomaOverlay());
  count.classList.remove('bump');
  void count.offsetWidth;
  count.classList.add('bump');
}

fetch('/api/overlay-stats')
  .then((response) => response.json())
  .then((stats) => { viewerCount = contarEspectadores(stats.viewerCount); render(); })
  .catch(() => {});

cargarLocaleOverlay().then(() => {
  aplicarI18nOverlay();
  conectarWSOverlay((message) => {
    if (message.type === 'viewers') {
      viewerCount = contarEspectadores(message.total);
      render();
    }
    if (message.type === 'config-updated') aplicarA11y(message.config || {});
  });
});

const aplicarA11y = iniciarAccesibilidadOverlay();
