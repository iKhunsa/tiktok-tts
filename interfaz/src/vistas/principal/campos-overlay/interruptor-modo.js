import { t } from '../../../nucleo/i18n/i18n.js';

const MODOS = ['basico', 'avanzado'];
const PASOS = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

function crearOpcion(modo) {
  const boton = document.createElement('button');
  boton.type = 'button';
  boton.className = 'cfg-boton';
  boton.setAttribute('role', 'radio');
  boton.dataset.modoEditor = modo;
  boton.dataset.i18n = `overlayCfg.modo.${modo}`;
  boton.textContent = t(`overlayCfg.modo.${modo}`);
  return boton;
}

// Flechas, Inicio y Fin mueven y eligen a la vez, como en cualquier grupo de radios.
function alPulsarTecla(evento, alElegir) {
  const actual = MODOS.indexOf(evento.target.closest('[data-modo-editor]')?.dataset.modoEditor);
  const destino = evento.key === 'Home' ? 0 : evento.key === 'End' ? MODOS.length - 1 : actual + PASOS[evento.key];
  if (actual < 0 || !(destino >= 0 && destino < MODOS.length)) return;
  evento.preventDefault();
  alElegir(MODOS[destino], { enfocar: true });
}

/** Interruptor segmentado Basico | Avanzado, fijo arriba del panel de ajustes. */
export function crearInterruptorModo(alElegir) {
  const contenedor = document.createElement('div');
  contenedor.className = 'cfg-modo';
  contenedor.dataset.modoUi = '';
  const grupo = document.createElement('div');
  grupo.className = 'cfg-botones';
  grupo.setAttribute('role', 'radiogroup');
  grupo.setAttribute('aria-label', t('overlayCfg.modo.etiqueta'));
  grupo.append(...MODOS.map(crearOpcion));
  grupo.addEventListener('click', (evento) => {
    const modo = evento.target.closest('[data-modo-editor]')?.dataset.modoEditor;
    if (modo) alElegir(modo);
  });
  grupo.addEventListener('keydown', (evento) => alPulsarTecla(evento, alElegir));
  contenedor.append(grupo);
  return contenedor;
}

/** Marca el modo activo (aria-checked) y deja solo ese en el orden de tabulacion. */
export function marcarModo(interruptor, modo) {
  interruptor.querySelectorAll('[data-modo-editor]').forEach((boton) => {
    const activo = boton.dataset.modoEditor === modo;
    boton.setAttribute('aria-checked', String(activo));
    boton.tabIndex = activo ? 0 : -1;
  });
}
