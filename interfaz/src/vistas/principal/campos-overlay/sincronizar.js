import { ESQUEMAS } from '../../../../compartido/estilo/esquemas.js';
import { construirQuery } from '../../../../compartido/estilo/query.js';
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

const CON_BOTONES = ['botones', 'rejilla', 'oculto'];

function pintarCampo(overlay, campo, valor) {
  if (CON_BOTONES.includes(campo.ui)) return;
  if (campo.tipo === 'plataformas') return pintarPlataformas(overlay, campo, valor);

  const entrada = entradaDe(overlay, campo.clave);
  if (!entrada) return; // campo escrito a mano en index.html: lo pinta applySettings
  if (campo.tipo === 'bool') {
    entrada.checked = Boolean(valor);
    return;
  }
  entrada.value = valor;
  if (campo.ui !== 'rango') return;
  paintRangeFill(entrada);
  entrada.closest('.cfg-field').querySelector('[data-cfg-valor]').textContent = textoValor(campo, valor);
}

function pintarBotones(overlay, guardado) {
  document.querySelectorAll(`[data-cfg-overlay="${overlay}"][data-cfg-fija]`).forEach((boton) => {
    const activo = Object.entries(JSON.parse(boton.dataset.cfgFija))
      .every(([clave, valor]) => guardado[clave] === valor);
    boton.setAttribute('aria-pressed', String(activo));
  });
}

/** Los ajustes de un efecto solo se ven con el efecto encendido (`dependeDe` en el esquema). */
export function pintarDependientes(overlay) {
  const guardado = appSettings.overlays[overlay];
  document.querySelectorAll(`[data-cfg-overlay="${overlay}"][data-cfg-depende-de]`).forEach((campo) => {
    campo.hidden = !guardado[campo.dataset.cfgDependeDe];
  });
}

export const camposDeGrupo = (overlay, grupo) => ESQUEMAS[overlay].filter((campo) => campo.grupo === grupo);

/** El boton de restablecer de un acordeon solo se ve si algo suyo difiere de fabrica. */
export function pintarRestablecer(overlay) {
  document.querySelectorAll(`[data-cfg-overlay="${overlay}"][data-cfg-reset-grupo]`).forEach((boton) => {
    boton.hidden = !construirQuery(camposDeGrupo(overlay, boton.dataset.cfgResetGrupo), appSettings.overlays[overlay]);
  });
}

/** Refleja appSettings.overlays[overlay] en los campos ya montados. */
export function sincronizarCamposOverlay(overlay) {
  const guardado = appSettings.overlays[overlay];
  for (const campo of ESQUEMAS[overlay]) pintarCampo(overlay, campo, guardado[campo.clave]);
  pintarBotones(overlay, guardado);
  pintarDependientes(overlay);
  pintarRestablecer(overlay);
}
