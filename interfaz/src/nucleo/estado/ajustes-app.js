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
import { setFieldVal, setChecked, paintRangeFill } from '../../componentes/campos-formulario.js';
import { renderChatTogglesState, renderTwitchSectionState } from '../../vistas/principal/toggles-chat.js';
import { updateConnectorChipState } from '../../vistas/principal/voces.js';
import { updateBgPreview } from '../../vistas/principal/subida-fondo.js';
import { updateOverlayUrl, updateSocialOverlayUrl } from '../../vistas/principal/configurador-overlays.js';

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
  readChat: true,
  readGifts: false,
  readGiftAmount: true,
  readJoins: false,
  readFollows: false,
  readLikes: false,
  readShares: false,
  readTwitchSub: false,
  readTwitchCheer: false,
  readTwitchRaid: false,
  readTwitchFollow: false,
  sayUsername: true,
  sayUsernameConnector: true,
  chatTogglesCollapsed: true,
  twitchSectionCollapsed: true,
  langFilterEnabled: false,
  dictFilterEnabled: false,
  allowedExtraLangs: [],
  lastUsername: '',
  pauseShortcut: null,
  skipShortcut: null,
  clearShortcut: null,
  musicPauseShortcut: null,
  musicSkipShortcut: null,
  overlays: {
    seguidores: { goal: '', color: '#FFBB00', bg: 0.80, bgimg: '' },
    likes: { rows: 10, color: '#FFBB00', bg: 0.80, bgimg: '' },
    alertas: { dur: 4000, color: '#FFBB00', bg: 0.90, bgimg: '' },
    creditos: { speed: 40, color: '#FFBB00', bg: 0.85, bgimg: '' },
    social: { layout: 'cols', color: '#FFBB00', bg: 0.80, bgimg: '' },
    'alertas-social': { color: '#FFBB00', bg: 0.90, bgimg: '' },
    chat: {
      color: '#FFBB00',
      bg: 0.82,
      bgimg: '',
      maxmsgs: 30,
      size: 14,
      usernames: true,
      platforms: { tiktok: true, twitch: true, youtube: true, kick: true },
    },
  },
};

export let appSettings = {};
export let ttsRate = 1.0;
export let ttsVol = 1.0;

// Este modulo es el unico dueño de los bindings ttsRate/ttsVol; otros
// modulos (nucleo/tts/cola-tts.js) piden el cambio via estas funciones en
// vez de reasignar el import directamente (los imports de ES modules son
// de solo lectura desde quien los consume).
export function setTtsRate(v) { ttsRate = v; }
export function setTtsVol(v) { ttsVol = v; }

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

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    appSettings = raw ? deepMerge(DEFAULT_SETTINGS, JSON.parse(raw)) : JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  } catch (e) {
    console.warn('[settings] localStorage corrupto, usando valores por defecto', e);
    appSettings = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  }
}

export function saveSettings() {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(appSettings)); } catch (e) { /* localStorage no disponible */ }
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
  const rr = document.getElementById('rateRange');
  const vr = document.getElementById('volRange');
  if (rr) { rr.value = ttsRate; document.getElementById('rateVal').textContent = ttsRate.toFixed(1); paintRangeFill(rr); }
  if (vr) { vr.value = ttsVol; document.getElementById('volVal').textContent = Math.round(ttsVol * 100); paintRangeFill(vr); }

  const chipMap = {
    readChat: 'chip-chat', readGifts: 'chip-gifts', readGiftAmount: 'chip-gift-amount', readJoins: 'chip-joins',
    readFollows: 'chip-follows', readLikes: 'chip-likes', readShares: 'chip-shares', sayUsername: 'chip-username',
    readTwitchSub: 'chip-twitch-sub', readTwitchCheer: 'chip-twitch-cheer',
    readTwitchRaid: 'chip-twitch-raid', readTwitchFollow: 'chip-twitch-follow',
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
  renderTwitchSectionState();

  const langFilterCb = document.getElementById('langFilterToggle');
  if (langFilterCb) {
    langFilterCb.checked = !!appSettings.langFilterEnabled;
    langFilterCb.closest('.toggle-chip')?.classList.toggle('active', !!appSettings.langFilterEnabled);
  }

  const dictFilterCb = document.getElementById('dictFilterToggle');
  if (dictFilterCb) {
    dictFilterCb.checked = !!appSettings.dictFilterEnabled;
    dictFilterCb.closest('.toggle-chip')?.classList.toggle('active', !!appSettings.dictFilterEnabled);
  }

  const { seguidores, likes, alertas, creditos, social, chat } = appSettings.overlays || {};

  setFieldVal('cfg-seg-goal', seguidores.goal);
  setFieldVal('cfg-seg-color', seguidores.color);
  setFieldVal('cfg-seg-bg', seguidores.bg);
  const bgValEl = document.getElementById('cfg-seg-bg-val');
  if (bgValEl) bgValEl.textContent = Math.round(seguidores.bg * 100);

  if (chat) {
    setFieldVal('cfg-chat-color', chat.color);
    setFieldVal('cfg-chat-bg', chat.bg);
    setFieldVal('cfg-chat-maxmsgs', chat.maxmsgs);
    setFieldVal('cfg-chat-size', chat.size);
    setChecked('cfg-chat-usernames', chat.usernames !== false);
    setChecked('cfg-chat-platform-tiktok', chat.platforms?.tiktok !== false);
    setChecked('cfg-chat-platform-twitch', chat.platforms?.twitch !== false);
    setChecked('cfg-chat-platform-youtube', chat.platforms?.youtube !== false);
    setChecked('cfg-chat-platform-kick', chat.platforms?.kick !== false);
    const cbValEl = document.getElementById('cfg-chat-bg-val');
    if (cbValEl) cbValEl.textContent = Math.round(chat.bg * 100);
    const sizeValEl = document.getElementById('cfg-chat-size-val');
    if (sizeValEl) sizeValEl.textContent = chat.size || 14;
  }

  setFieldVal('cfg-likes-rows', likes.rows);
  setFieldVal('cfg-likes-color', likes.color);
  setFieldVal('cfg-likes-bg', likes.bg);
  const lbValEl = document.getElementById('cfg-likes-bg-val');
  if (lbValEl) lbValEl.textContent = Math.round(likes.bg * 100);

  setFieldVal('cfg-alertas-dur', alertas.dur);
  setFieldVal('cfg-alertas-color', alertas.color);
  setFieldVal('cfg-alertas-bg', alertas.bg);
  const abValEl = document.getElementById('cfg-alertas-bg-val');
  if (abValEl) abValEl.textContent = Math.round(alertas.bg * 100);

  if (creditos) {
    setFieldVal('cfg-creditos-speed', creditos.speed);
    setFieldVal('cfg-creditos-color', creditos.color);
    setFieldVal('cfg-creditos-bg', creditos.bg);
    const csValEl = document.getElementById('cfg-creditos-speed-val');
    if (csValEl) csValEl.textContent = creditos.speed;
    const cbValEl2 = document.getElementById('cfg-creditos-bg-val');
    if (cbValEl2) cbValEl2.textContent = Math.round(creditos.bg * 100);
  }

  if (social) {
    setFieldVal('cfg-social-layout', social.layout);
    setFieldVal('cfg-social-color', social.color);
    setFieldVal('cfg-social-bg', social.bg);
    const sbValEl = document.getElementById('cfg-social-bg-val');
    if (sbValEl) sbValEl.textContent = Math.round(social.bg * 100);
  }

  const alertasSocial = appSettings.overlays['alertas-social'];
  if (alertasSocial) {
    setFieldVal('cfg-alertas-social-color', alertasSocial.color);
    setFieldVal('cfg-alertas-social-bg', alertasSocial.bg);
    const asbValEl = document.getElementById('cfg-alertas-social-bg-val');
    if (asbValEl) asbValEl.textContent = Math.round(alertasSocial.bg * 100);
  }

  updateBgPreview('seguidores', seguidores.bgimg);
  updateBgPreview('likes', likes.bgimg);
  updateBgPreview('alertas', alertas.bgimg);
  updateBgPreview('chat', chat.bgimg);
  updateBgPreview('creditos', creditos.bgimg);
  updateBgPreview('social', social.bgimg);
  updateBgPreview('alertas-social', alertasSocial?.bgimg);

  updateOverlayUrl('seguidores');
  updateOverlayUrl('likes');
  updateOverlayUrl('chat');
  updateOverlayUrl('alertas');
  updateOverlayUrl('creditos');
  updateOverlayUrl('social');
  updateSocialOverlayUrl();
}
