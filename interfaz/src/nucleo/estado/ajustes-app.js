/**
 * Persistencia de settings en localStorage (tikliveTTS_v1) + aplicacion a
 * toda la UI. Es el estado mas transversal de la app: casi todas las
 * vistas leen `appSettings` o llaman `saveSettings()`. Portado 1:1 desde
 * la seccion PERSISTENCIA de index.html.
 *
 * `appSettings` se reasigna entero en loadSettings() (no solo se mutan
 * propiedades) — los imports de otros modulos (`import { appSettings }`)
 * ven el valor actualizado porque ES modules usan live bindings: la
 * reasignacion ocurre en este modulo, que es el unico dueño del binding.
 */
import { options } from './opciones-lectura.js';
import { setFieldVal, paintRangeFill } from '../../componentes/campos-formulario.js';
import { renderChatTogglesState } from '../../vistas/principal/toggles-chat.js';
import { updateConnectorChipState } from '../../vistas/principal/voces.js';
import { updateOverlayUrl } from '../../vistas/principal/configurador-overlays.js';
import { renderizarTodosLosCamposOverlay } from '../../vistas/principal/campos-overlay/index.js';
import { DEFAULTS_OVERLAYS } from '../../../compartido/estilo/esquemas.js';
import * as datosPorCuenta from './datos-por-cuenta.js';

// Circular import a proposito: los 4 modulos de arriba importan
// `appSettings`/`saveSettings` de este archivo. Es seguro porque todas las
// referencias cruzadas ocurren dentro de cuerpos de funcion (invocadas
// despues de que todos los modulos terminaron de evaluarse), nunca en el
// top-level de ningun archivo — ES modules soportan ciclos asi sin problema.

export const SETTINGS_KEY = 'tikliveTTS_v1';

export const DEFAULT_SETTINGS = {
  voice: 'es-MX',
  rate: 1.0,
  vol: 1.0,
  sonidosVolumen: 50, // volumen de la ventana del navegador de sonidos (0-100): hay sonidos muy fuertes, por eso arranca a la mitad
  pitch: 1.0,
  readChat: true,
  readGifts: false,
  readGiftAmount: true,
  readJoins: false,
  readFollows: false,
  readLikes: false,
  readShares: false,
  sayUsername: true,
  sayUsernameConnector: true,
  chatTogglesCollapsed: true,
  eventEffects: true, // animaciones/sonidos de temporada (componentes/eventos); activos por defecto
  // langFilterEnabled/dictFilterEnabled/allowedExtraLangs NO viven aca
  // (fase-05): fuente unica de verdad = config.json del servidor, ver
  // nucleo/estado/config-runtime.js. Antes duplicaban esas 3 claves con
  // el server y podian desincronizarse sin que nadie se enterara.
  lastUsername: '',
  pauseShortcut: null,
  skipShortcut: null,
  clearShortcut: null,
  musicPauseShortcut: null,
  musicSkipShortcut: null,
  overlays: DEFAULTS_OVERLAYS,
  overlayLienzo: '16:9',
  escenas: [{ nombre: "", ids: [], nombres: {} }], // editor de canvas: ids de overlay por escena
  skinsFavoritas: [],
  // Ajustes propios de cada archivo .epik, por id (vistas/principal/epik/estado.js).
  epik: {},
  epikOcultos: [], // .epik quitados de favoritos: no salen en el selector de skins
};

export let appSettings = {};
export let ttsRate = 1.0;
export let ttsVol = 1.0;
export let ttsPitch = 1.0;

// Este modulo es el unico dueño de los bindings ttsRate/ttsVol/ttsPitch; otros
// modulos (nucleo/tts/cola-tts.js) piden el cambio via estas funciones en
// vez de reasignar el import directamente (los imports de ES modules son
// de solo lectura desde quien los consume).
export function setTtsRate(v) { ttsRate = v; }
export function setTtsVol(v) { ttsVol = v; }
export function setTtsPitch(v) { ttsPitch = v; }

export function deepMerge(defaults, saved) {
  const out = JSON.parse(JSON.stringify(defaults));
  for (const k of Object.keys(saved)) {
    if (k in out && typeof out[k] === 'object' && out[k] !== null && !Array.isArray(out[k])) {
      out[k] = deepMerge(out[k], saved[k]);
    } else if (k in out) {
      out[k] = saved[k];
    }
  }
  return out;
}

// El tamano del texto del chat se llamaba `size` y ahora es `tamano` (esquema
// de overlays): se conserva lo que el usuario ya habia elegido.
function migrarOverlaysAnteriores(guardado) {
  const chat = guardado.overlays && guardado.overlays.chat;
  if (chat && chat.size !== undefined && chat.tamano === undefined) chat.tamano = chat.size;
  return guardado;
}

export function loadSettings() {
  try {
    const raw = datosPorCuenta.get(SETTINGS_KEY);
    const guardado = raw ? migrarOverlaysAnteriores(JSON.parse(raw)) : null;
    appSettings = guardado ? deepMerge(DEFAULT_SETTINGS, guardado) : JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
    // deepMerge solo conserva claves conocidas: los ids de .epik no lo son, se copian tal cual.
    if (guardado?.epik && typeof guardado.epik === 'object') appSettings.epik = guardado.epik;
    // Igual con las capas GIF del editor de canvas (`gif:<id>`): se copian tal cual (campos-gif.js#esCapaGif las valida al usarlas).
    for (const [id, cfg] of Object.entries(guardado?.overlays ?? {})) {
      if (id.startsWith('gif:') && cfg && typeof cfg === 'object') appSettings.overlays[id] = cfg;
    }
  } catch (e) {
    console.warn('[settings] localStorage corrupto, usando valores por defecto', e);
    appSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  }
}

// Respaldo en disco (/api/ajustes-ui, por cuenta): localStorage puede vaciarse o corromperse, y con él se irían los
// overlays, escenas y capas del editor de canvas. Cada guardado lleva su marca de tiempo para saber cuál copia es más nueva.
const SETTINGS_TS_KEY = 'tikliveTTS_v1_guardado';
const ESPERA_RESPALDO_MS = 800;
let temporizadorRespaldo = null;

function enviarRespaldo() {
  temporizadorRespaldo = null;
  const guardado = Number(datosPorCuenta.get(SETTINGS_TS_KEY)) || Date.now();
  fetch('/api/ajustes-ui', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ guardado, datos: appSettings }),
  }).catch(() => {}); // sin servidor la copia de localStorage sigue valiendo; el siguiente guardado reintenta
}

export function saveSettings() {
  datosPorCuenta.set(SETTINGS_KEY, JSON.stringify(appSettings));
  datosPorCuenta.set(SETTINGS_TS_KEY, String(Date.now()));
  clearTimeout(temporizadorRespaldo);
  temporizadorRespaldo = setTimeout(enviarRespaldo, ESPERA_RESPALDO_MS); // agrupa ráfagas (sliders, arrastres)
}

/**
 * Concilia localStorage con la copia en disco, una vez conocida la cuenta: gana la más nueva. Si localStorage se
 * vació, los ajustes vuelven del disco; si el disco no tiene copia todavía, se crea con lo que hay en localStorage.
 */
export async function hidratarAjustesDesdeDisco() {
  try {
    const respuesta = await fetch('/api/ajustes-ui');
    if (!respuesta.ok) return;
    const { guardado, datos } = await respuesta.json();
    const local = Number(datosPorCuenta.get(SETTINGS_TS_KEY)) || 0;
    const hayLocal = !!datosPorCuenta.get(SETTINGS_KEY);
    if (datos && guardado > local) {
      datosPorCuenta.set(SETTINGS_KEY, JSON.stringify(datos));
      datosPorCuenta.set(SETTINGS_TS_KEY, String(guardado));
      loadSettings();
      applySettings();
    } else if (hayLocal && (!datos || local > guardado)) {
      enviarRespaldo();
    }
  } catch (_) { /* sin servidor se sigue con localStorage */ }
}

/**
 * Pinta appSettings sobre toda la UI. Toca varias vistas (toggles de
 * chat, overlays, subida de fondo) a proposito — es la funcion "glue"
 * que sincroniza el estado cargado con lo que se ve en pantalla al
 * arrancar o al cambiar de idioma (retranslateDynamic).
 */
export function applySettings() {
  ttsRate = appSettings.rate;
  ttsVol = appSettings.vol;
  ttsPitch = appSettings.pitch ?? 1.0;
  const rr = document.getElementById('rateRange');
  const vr = document.getElementById('volRange');
  const pr = document.getElementById('pitchRange');
  if (rr) { rr.value = ttsRate; document.getElementById('rateVal').textContent = ttsRate.toFixed(1); paintRangeFill(rr); }
  if (vr) { vr.value = ttsVol; document.getElementById('volVal').textContent = Math.round(ttsVol * 100); paintRangeFill(vr); }
  if (pr) { pr.value = ttsPitch; document.getElementById('pitchVal').textContent = ttsPitch.toFixed(2); paintRangeFill(pr); }

  const chipMap = {
    readChat: 'chip-chat', readGifts: 'chip-gifts', readGiftAmount: 'chip-gift-amount', readJoins: 'chip-joins',
    readFollows: 'chip-follows', readLikes: 'chip-likes', readShares: 'chip-shares', sayUsername: 'chip-username',
  };
  for (const [key, chipId] of Object.entries(chipMap)) {
    const val = appSettings[key];
    options[key] = val;
    const chip = document.getElementById(chipId);
    if (!chip) continue;
    const cb = chip.querySelector('input[type=checkbox]');
    if (cb) cb.checked = val;
    chip.classList.toggle('active', val);
  }

  const connCb = document.getElementById('sayUsernameConnectorToggle');
  if (connCb) {
    connCb.checked = !!appSettings.sayUsernameConnector;
    connCb.closest('.toggle-chip')?.classList.toggle('active', !!appSettings.sayUsernameConnector);
  }
  updateConnectorChipState();

  renderChatTogglesState();

  // langFilterToggle/dictFilterToggle ya NO se hidratan aca: los pinta
  // config-runtime.js#applyFiltroIdiomaConfig() con el valor real del
  // servidor (loadRuntimeConfig corre despues de applySettings en el
  // arranque, ver vistas/principal/index.js).

  renderizarTodosLosCamposOverlay();

  updateOverlayUrl('seguidores');
  updateOverlayUrl('alertas');
  updateOverlayUrl('creditos');
  updateOverlayUrl('social');
  updateOverlayUrl('alertas-social');
}
