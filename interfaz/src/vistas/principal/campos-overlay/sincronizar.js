import { ESQUEMAS } from '../../../../compartido/estilo/esquemas.js';
import { appSettings } from '../../../nucleo/estado/ajustes-app.js';
import { paintRangeFill } from '../../../componentes/campos-formulario.js';
import { textoValor } from './etiquetas.js';

function entradaDe(overlay, clave, plataforma) {
  const extra = plataforma ? `[data-cfg-plataforma="${plataforma}"]` : ':not([data-cfg-plataforma])';
  return document.querySelector(`[data-cfg-overlay="${overlay}"][data-cfg-clave="${clave}"]${extra}`);
}

function pintarPlataformas(overlay, campo, valor) {
  for (const [nombre, visible] of Object.entries(valor)) {
    entradaDe(overlay, campo.clave, nombre).checked = visible !== false;
  }
}

function pintarCampo(overlay, campo, valor) {
  if (campo.tipo === 'plataformas') return pintarPlataformas(overlay, campo, valor);

  const entrada = entradaDe(overlay, campo.clave);
  if (campo.tipo === 'bool') {
    entrada.checked = Boolean(valor);
    return;
  }
  entrada.value = valor;
  if (campo.ui !== 'rango') return;
  paintRangeFill(entrada);
  entrada.closest('.cfg-field').querySelector('[data-cfg-valor]').textContent = textoValor(campo, valor);
}

/** Refleja appSettings.overlays[overlay] en los campos ya montados. */
export function sincronizarCamposOverlay(overlay) {
  const guardado = appSettings.overlays[overlay];
  for (const campo of ESQUEMAS[overlay]) pintarCampo(overlay, campo, guardado[campo.clave]);
}
