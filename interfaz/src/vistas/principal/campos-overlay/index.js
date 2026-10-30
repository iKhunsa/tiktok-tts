import { ESQUEMAS } from '../../../../compartido/estilo/esquemas.js';
import { appSettings, saveSettings } from '../../../nucleo/estado/ajustes-app.js';
import { t } from '../../../nucleo/i18n/i18n.js';
import { showToast } from '../../../componentes/toast.js';
import { updateOverlayUrl } from '../configurador-overlays.js';
import { montarCamposOverlay } from './montar.js';
import { pintarDependientes, pintarRestablecer, sincronizarCamposOverlay } from './sincronizar.js';
import { alPulsarRestablecerGrupo } from './restablecer-grupo.js';
import { leerValorDeEntrada } from './leer-valor.js';
import { textoValor } from './etiquetas.js';

const OVERLAYS_CON_ESQUEMA = Object.keys(ESQUEMAS);

const campoDe = (overlay, clave) => ESQUEMAS[overlay].find((campo) => campo.clave === clave);

function guardarCambio(overlay, clave, valor) {
  appSettings.overlays[overlay][clave] = valor;
  updateOverlayUrl(overlay);
  saveSettings();
}

// Siempre debe quedar al menos una plataforma visible: si no, el chat quedaria vacio sin explicacion.
function cambiarPlataforma(entrada, campo) {
  const { cfgOverlay: overlay, cfgPlataforma: plataforma } = entrada.dataset;
  const visibles = { ...appSettings.overlays[overlay][campo.clave], [plataforma]: entrada.checked };
  if (!Object.values(visibles).some(Boolean)) {
    entrada.checked = true;
    showToast(t('toast.minOnePlatform'));
    return;
  }
  guardarCambio(overlay, campo.clave, visibles);
}

function cambiarValor(entrada, campo) {
  const valor = leerValorDeEntrada(entrada, campo);
  if (campo.ui === 'rango') {
    entrada.closest('.cfg-field').querySelector('[data-cfg-valor]').textContent = textoValor(campo, valor);
  }
  const overlay = entrada.dataset.cfgOverlay;
  const prender = campo.activa && !appSettings.overlays[overlay][campo.activa];
  if (prender) appSettings.overlays[overlay][campo.activa] = true;
  guardarCambio(overlay, campo.clave, valor);
  pintarDependientes(overlay);
  pintarRestablecer(overlay);
  if (campo.espeja) espejar(overlay, campo);
  if (prender || campo.espeja) sincronizarCamposOverlay(overlay);
}

const OPUESTO = { izquierda: 'derecha', derecha: 'izquierda' };

// Invertir el mensaje invierte tambien sus alineaciones laterales, para que la vista siga coincidiendo con lo marcado.
function espejar(overlay, campo) {
  for (const clave of campo.espeja) {
    const valor = appSettings.overlays[overlay][clave];
    if (OPUESTO[valor]) guardarCambio(overlay, clave, OPUESTO[valor]);
  }
}

function alPulsarBoton(evento) {
  const boton = evento.target.closest('[data-cfg-fija]');
  if (!boton) return;
  const overlay = boton.dataset.cfgOverlay;
  Object.entries(JSON.parse(boton.dataset.cfgFija)).forEach(([clave, valor]) => guardarCambio(overlay, clave, valor));
  sincronizarCamposOverlay(overlay);
}

function alEditarCampo(evento) {
  const entrada = evento.target.closest('[data-cfg-clave]');
  if (!entrada) return;
  const campo = campoDe(entrada.dataset.cfgOverlay, entrada.dataset.cfgClave);
  if (entrada.dataset.cfgPlataforma) cambiarPlataforma(entrada, campo);
  else cambiarValor(entrada, campo);
}

function renderizarCamposOverlay(overlay) {
  montarCamposOverlay(overlay);
  sincronizarCamposOverlay(overlay);
  updateOverlayUrl(overlay);
}

/** Dibuja y rellena los campos de los overlays con esquema (se repite al cambiar de idioma). */
export function renderizarTodosLosCamposOverlay() {
  OVERLAYS_CON_ESQUEMA.forEach(renderizarCamposOverlay);
}

/** Un solo listener para todos los campos generados (los inputs se recrean al montar). */
export function iniciarCamposOverlay() {
  const vista = document.getElementById('view-overlays');
  vista.addEventListener('input', alEditarCampo);
  vista.addEventListener('click', alPulsarBoton);
  vista.addEventListener('click', alPulsarRestablecerGrupo);
}
