import { t } from '../../../nucleo/i18n/i18n.js';
import { driverTourDefaults } from '../../../nucleo/tours/driver.js';
import { trackUi } from '../../../nucleo/telemetria-ui.js';

const lista = () => document.getElementById('ovlEditorEscenas');
const opcionAtajo = () => document.querySelector('#ovlEditorMenu [data-i18n$=".asignarAtajo"]')?.closest('button');

/**
 * Tour que enseña donde asignar el atajo de una escena: la lista de escenas -> clic derecho -> "Asignar atajo".
 * `abrirMenuEscena` abre el menu de la escena activa; `cerrarMenu` lo cierra.
 */
export function iniciarTourAtajoEscena({ abrirMenuEscena, cerrarMenu }) {
  trackUi('ui:tour-started', 'escena_atajo');
  if (!(window.driver && window.driver.js)) return;
  lista().previousElementSibling.setAttribute('aria-expanded', 'true');

  const tour = window.driver.js.driver({
    ...driverTourDefaults(),
    onDestroyed: cerrarMenu,
    steps: [
      {
        element: lista(),
        popover: {
          title: t('overlayCat.editor.tourAtajoEscenasTitulo'),
          description: t('overlayCat.editor.tourAtajoEscenasDesc'),
          side: 'right',
          align: 'start',
          onNextClick: () => { abrirMenuEscena(); tour.moveNext(); },
        },
      },
      {
        element: opcionAtajo,
        popover: {
          title: t('overlayCat.editor.tourAtajoOpcionTitulo'),
          description: t('overlayCat.editor.tourAtajoOpcionDesc'),
          side: 'right',
          align: 'start',
          onPrevClick: () => { cerrarMenu(); tour.movePrevious(); },
        },
        // Elegir la opcion de verdad abre el modal del atajo: el tour ya cumplio su trabajo.
        onHighlighted: () => opcionAtajo()?.addEventListener('click', () => tour.destroy(), { once: true }),
      },
    ],
  });
  tour.drive();
}
