import { t } from '../../../nucleo/i18n/i18n.js';
import { appSettings } from '../../../nucleo/estado/ajustes-app.js';
import { showToast } from '../../../componentes/toast.js';
import { crearRestaurador } from './restaurador-atajos.js';

/**
 * Registra en el proceso principal los atajos de escena guardados. Al arrancar los atajos solo viven en los ajustes
 * (el registro del proceso principal empieza vacio) y los ajustes de la cuenta llegan despues que la pagina: por eso
 * se llama cada vez que se cargan (loadSettings), no solo al iniciar. No hace falta abrir el editor.
 */
export const restaurarAtajosEscenas = crearRestaurador({
  leerEscenas: () => appSettings.escenas,
  leerApi: () => window.electronAPI,
  avisarFallo: (escena, resultado) => showToast(t('overlayCat.editor.atajoNoRegistrado', {
    atajo: escena.shortcut,
    motivo: resultado?.error === 'conflict' ? t('conn.shortcutConflict') : (resultado?.error || t('conn.shortcutUnavailable')),
  }), 'error'),
});
