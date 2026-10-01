import { ESQUEMAS } from '../../../../compartido/estilo/esquemas.js';
import { appSettings, saveSettings } from '../../../nucleo/estado/ajustes-app.js';
import { t } from '../../../nucleo/i18n/i18n.js';
import { showToast } from '../../../componentes/toast.js';
import { updateOverlayUrl } from '../configurador-overlays.js';
import { montarCamposOverlay } from './montar.js';
import { sincronizarCamposOverlay } from './sincronizar.js';
import { leerValorDeEntrada } from './leer-valor.js';
import { textoValor } from './etiquetas.js';

const OVERLAYS_CON_ESQUEMA = ['chat', 'likes', 'donadores'];

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
  guardarCambio(entrada.dataset.cfgOverlay, campo.clave, valor);
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
}
