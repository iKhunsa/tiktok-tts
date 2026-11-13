import { ESQUEMAS } from '../../../../compartido/estilo/esquemas.js';
import { appSettings, saveSettings } from '../../../nucleo/estado/ajustes-app.js';
import { almacenSesion, tieneAccesoPro } from '../../../nucleo/estado/sesion.js';
import { t } from '../../../nucleo/i18n/i18n.js';
import { showToast } from '../../../componentes/toast.js';
import { updateOverlayUrl } from '../configurador-overlays.js';
import { fijarValorOverlay, valorOverlay } from '../overlays-catalogo/posicion-escena.js';
import { montarCamposOverlay } from './montar.js';
import { pintarDependientes, pintarRestablecer, sincronizarCamposOverlay } from './sincronizar.js';
import { alPulsarRestablecerGrupo } from './restablecer-grupo.js';
import { leerValorDeEntrada } from './leer-valor.js';
import { textoValor } from './etiquetas.js';
import { montarSeccionEpik } from '../epik/seccion.js';

const OVERLAYS_CON_ESQUEMA = Object.keys(ESQUEMAS);

const campoDe = (overlay, clave) => ESQUEMAS[overlay].find((campo) => campo.clave === clave);

function guardarCambio(overlay, clave, valor) {
  fijarValorOverlay(overlay, clave, valor);
  // Elegir una skin con presets pone lo que esa skin muestra por defecto; luego el usuario lo cambia a mano.
  const presets = clave === 'skin' && campoDe(overlay, 'skin')?.presets;
  if (presets) Object.assign(appSettings.overlays[overlay], presets[valor] ?? presets.base);
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
    const valor = valorOverlay(overlay, clave);
    if (OPUESTO[valor]) guardarCambio(overlay, clave, OPUESTO[valor]);
  }
}

function alPulsarBoton(evento) {
  const boton = evento.target.closest('[data-cfg-fija]');
  if (!boton) return;
  const overlay = boton.dataset.cfgOverlay;
  const valores = JSON.parse(boton.dataset.cfgFija);
  Object.entries(valores).forEach(([clave, valor]) => guardarCambio(overlay, clave, valor));
  sincronizarCamposOverlay(overlay);
  if ('skin' in valores) montarSeccionEpik(overlay); // los ajustes propios de un .epik siguen a la skin
}

/** Pone una skin en un overlay (ej. al quitar el .epik que estaba en uso vuelve a la de fabrica). */
export function ponerSkin(overlay, skin) {
  guardarCambio(overlay, 'skin', skin);
  sincronizarCamposOverlay(overlay);
  montarSeccionEpik(overlay);
}

function alEditarCampo(evento) {
  const entrada = evento.target.closest('[data-cfg-clave]');
  if (!entrada) return;
  const campo = campoDe(entrada.dataset.cfgOverlay, entrada.dataset.cfgClave);
  if (entrada.dataset.cfgPlataforma) cambiarPlataforma(entrada, campo);
  else cambiarValor(entrada, campo);
}

/** Pone la skin en todos los overlays que la ofrecen (boton Usar de la tienda). */
export function aplicarSkin(skin) {
  OVERLAYS_CON_ESQUEMA.filter((overlay) => campoDe(overlay, 'skin')?.premium.includes(skin)).forEach((overlay) => {
    guardarCambio(overlay, 'skin', skin);
    sincronizarCamposOverlay(overlay);
  });
}

function renderizarCamposOverlay(overlay) {
  montarCamposOverlay(overlay);
  montarSeccionEpik(overlay);
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

  // Las URL de OBS y las vistas previas dependen del plan (una skin premium guardada no sale sin Pro, ver
  // buildOverlayUrl). La sesion se hidrata despues de arrancar y el plan puede cambiar (compra, vencimiento).
  let conAcceso = tieneAccesoPro();
  almacenSesion.subscribe(() => {
    if (tieneAccesoPro() === conAcceso) return;
    conAcceso = tieneAccesoPro();
    OVERLAYS_CON_ESQUEMA.forEach(updateOverlayUrl);
  });
}
