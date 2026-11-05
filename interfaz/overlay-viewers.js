import { cargarLocaleOverlay, aplicarI18nOverlay, idiomaOverlay } from './compartido/i18n-overlay.js';
import { leerParametros, aplicarParametrosVisuales } from './compartido/parametros.js';
import { iniciarAccesibilidadOverlay } from './compartido/accesibilidad.js';
import { registrarErroresOverlay } from './compartido/registrar-errores.js';
import { esVistaPrevia } from './compartido/vista-previa.js';
import { iniciarFuenteContador } from './compartido/fuente-contador.js';
import { iniciarOverlayFijo } from './compartido/estilo/aplicar-overlay-fijo.js';
import { elegirEntrada } from './compartido/epik/anfitrion.js';

function nativo() {
  iniciarOverlayFijo('viewers', 460, 112);
  registrarErroresOverlay();
  const params = leerParametros();
  aplicarParametrosVisuales(params);

  function render({ valor }) {
    const count = document.getElementById('viewerCount');
    count.textContent = valor.toLocaleString(idiomaOverlay());
    count.classList.remove('bump');
    void count.offsetWidth;
    count.classList.add('bump');
  }

  const aplicarA11y = iniciarAccesibilidadOverlay();
  iniciarFuenteContador('viewers', { vistaPrevia: esVistaPrevia(params), alCambio: render, alConfig: aplicarA11y });
  cargarLocaleOverlay().then(() => aplicarI18nOverlay());
}

elegirEntrada({ nativo, epik: () => import('./compartido/epik/anfitrion-contador.js').then((m) => m.iniciar('viewers', nativo)) });
