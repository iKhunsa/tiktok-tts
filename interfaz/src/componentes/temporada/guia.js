import { t } from '../../nucleo/i18n/i18n.js';
import { driverTourDefaults } from '../../nucleo/tours/driver.js';
import { guiasTemporadaVistas, registrarGuiaTemporadaVista } from './estado.js';

const MAX_VECES = 2; // despues de dos cierres ya sabe donde esta el boton: la guia deja de salir
const ESPERA_MS = 350; // la ventana principal recupera el foco al cerrarse la de la temporada: se deja respirar antes de senalar

/**
 * Las dos primeras veces que una cuenta cierra la ventana de la temporada, una guia (driver.js) senala el boton de la barra de
 * titulo desde donde puede volver a abrirla. Despues de dos cierres, por cuenta, no vuelve a salir.
 */
export function mostrarGuiaTemporada(temporada) {
  const boton = document.getElementById('titlebarSeason');
  if (!boton || boton.hidden || !(window.driver && window.driver.js)) return;
  if (guiasTemporadaVistas(temporada.id) >= MAX_VECES) return;
  registrarGuiaTemporadaVista(temporada.id);
  setTimeout(() => {
    const base = `temporada.${temporada.id}`;
    window.driver.js.driver({
      ...driverTourDefaults(),
      showProgress: false,
      showButtons: ['next'],
      doneBtnText: t('temporada.guia.entendido'),
      nextBtnText: t('temporada.guia.entendido'),
      // El boton es compacto en reposo: durante la guia se muestra abierto, con su nombre.
      onHighlightStarted: () => boton.classList.add('is-abierto'),
      onDestroyed: () => boton.classList.remove('is-abierto'),
      steps: [{ element: boton, popover: { title: t('temporada.guia.titulo'), description: t(`${base}.guia`), side: 'bottom', align: 'end' } }],
    }).drive();
  }, ESPERA_MS);
}
