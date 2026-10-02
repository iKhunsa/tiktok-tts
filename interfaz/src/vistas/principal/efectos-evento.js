/**
 * Boton del chat que apaga/enciende los efectos de evento (animaciones, sonidos
 * y toda la capa decorativa de temporada). Solo se muestra mientras hay un
 * evento vigente; el ajuste `eventEffects` es por cuenta y esta activo por defecto.
 */
import { t } from '../../nucleo/i18n/i18n.js';
import { appSettings, saveSettings } from '../../nucleo/estado/ajustes-app.js';
import { almacenSesion } from '../../nucleo/estado/sesion.js';
import {
  efectosActivados, hayEventoActivo, previsualizarEventoActivo, detenerEvento,
} from '../../componentes/eventos/index.js';

const ID_BOTON = 'btnEventEffects';

function pintarBoton() {
  const boton = document.getElementById(ID_BOTON);
  if (!boton) return;
  const activados = efectosActivados();
  const clave = activados ? 'eventFx.on' : 'eventFx.off';
  boton.hidden = !hayEventoActivo();
  boton.setAttribute('aria-pressed', String(activados));
  boton.dataset.i18nTitle = clave; // que un cambio de idioma conserve el texto del estado actual
  boton.title = t(clave);
}

function alternarEfectos() {
  appSettings.eventEffects = !efectosActivados();
  saveSettings();
  pintarBoton();
  if (efectosActivados()) previsualizarEventoActivo();
  else detenerEvento();
}

export function iniciarBotonEfectosEvento() {
  document.getElementById(ID_BOTON)?.addEventListener('click', alternarEfectos);
  pintarBoton();
  // Cambiar de cuenta cambia los ajustes; se repinta tras aplicarSesion (que los recarga en el mismo tick).
  almacenSesion.subscribe(() => Promise.resolve().then(pintarBoton));
}
