import { cargarLocaleOverlay, aplicarI18nOverlay, idiomaOverlay } from './compartido/i18n-overlay.js';
import { leerParametros, aplicarParametrosVisuales, intParam } from './compartido/parametros.js';
import { iniciarAccesibilidadOverlay } from './compartido/accesibilidad.js';
import { registrarErroresOverlay } from './compartido/registrar-errores.js';
import { esVistaPrevia } from './compartido/vista-previa.js';
import { iniciarFuenteContador } from './compartido/fuente-contador.js';
import { iniciarOverlayFijo } from './compartido/estilo/aplicar-overlay-fijo.js';
import { elegirEntrada } from './compartido/epik/anfitrion.js';

function nativo() {
  iniciarOverlayFijo('seguidores', 200, 180);
  registrarErroresOverlay();

  const params = leerParametros();
  aplicarParametrosVisuales(params);
  const goal = intParam(params, 'goal', 0);
  const formatear = (valor) => valor.toLocaleString(idiomaOverlay());

  function render({ valor: total, base }) {
    const el = document.getElementById('count');
    el.textContent = formatear(total);
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');

    if (goal > 0) {
      document.getElementById('divider').style.display = '';
      document.getElementById('goalSection').style.display = '';
      document.getElementById('goalTarget').textContent = formatear(base + goal);
      document.getElementById('goalBar').style.width = `${Math.min(((total - base) / goal) * 100, 100)}%`;
      document.getElementById('goalCurrent').textContent = formatear(total);
    }
  }

  const aplicarA11y = iniciarAccesibilidadOverlay();
  iniciarFuenteContador('seguidores', { vistaPrevia: esVistaPrevia(params), alCambio: render, alConfig: aplicarA11y });
  cargarLocaleOverlay().then(() => aplicarI18nOverlay());
}

elegirEntrada({ nativo, epik: () => import('./compartido/epik/anfitrion-contador.js').then((m) => m.iniciar('seguidores', nativo)) });
