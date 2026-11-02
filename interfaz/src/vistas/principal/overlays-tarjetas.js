import { aplicarTraducciones } from '../../nucleo/i18n/i18n.js';
import { crearEscenario, crearSeccionLienzo, crearSeccionNiveles, pintarLienzos } from './lienzo-overlay.js';
import { EVENTOS_ALERTA } from '../../../compartido/eventos-alerta.js';
import { alAbrirTarjetaOverlay, alCerrarTarjetaOverlay } from './configurador-overlays.js';

export function fijarAbierta(tarjeta, abierta) {
  tarjeta.classList.toggle('abierta', abierta);
  if (abierta) {
    pintarLienzos();
    alAbrirTarjetaOverlay(tarjeta);
  }
  else alCerrarTarjetaOverlay(tarjeta);
}

/** El tutorial apunta a campos dentro de estas tarjetas: tienen que estar abiertas. */
export function abrirTarjetasOverlays(tipos) {
  tipos.forEach((tipo) => fijarAbierta(document.querySelector(`[data-preview="${tipo}"]`).closest('.cfg-card'), true));
}

// Los ajustes basicos son la unica seccion que empieza abierta: sin ellos el panel se veria vacio.
function crearSeccionGeneral(campos) {
  const seccion = document.createElement('details');
  seccion.className = 'cfg-grupo';
  seccion.open = true;
  seccion.innerHTML = '<summary class="cfg-grupo-titulo" data-i18n="overlayCfg.grupo.general"></summary>';
  seccion.append(campos);
  aplicarTraducciones(seccion);
  return seccion;
}

// Pagina del overlay: vista previa y URL a la izquierda, ajustes a la derecha.
function separarLienzoEInspector(tarjeta) {
  const lienzo = document.createElement('div');
  lienzo.className = 'ovl-lienzo';
  lienzo.append(crearEscenario(tarjeta.querySelector('.cfg-preview')), tarjeta.querySelector('.cfg-url-row'));
  const inspector = document.createElement('div');
  inspector.className = 'ovl-inspector';
  inspector.append(...[...tarjeta.children]
    .filter((hijo) => !hijo.matches('.cfg-header'))
    .map((hijo) => (hijo.matches('.cfg-fields') ? crearSeccionGeneral(hijo) : hijo)));
  const preview = lienzo.querySelector('.cfg-preview');
  const alerta = EVENTOS_ALERTA[preview.dataset.preview];
  if (alerta?.muestras) inspector.prepend(crearSeccionNiveles(preview, alerta));
  inspector.prepend(crearSeccionLienzo());
  tarjeta.append(lienzo, inspector);
}

/** La cabecera de cada tarjeta es una fila que lleva a la pagina de ese overlay. */
export function iniciarTarjetasOverlays() {
  document.querySelectorAll('#view-overlays .cfg-card').forEach((tarjeta) => {
    const cabecera = tarjeta.querySelector('.cfg-header');
    cabecera.setAttribute('role', 'button');
    cabecera.tabIndex = 0;
    const flecha = document.createElement('img');
    flecha.className = 'icon-inline cfg-fila-flecha';
    flecha.src = 'icons/chevron_right.svg';
    flecha.alt = '';
    cabecera.append(flecha);
    separarLienzoEInspector(tarjeta);
    fijarAbierta(tarjeta, false);
  });
}
