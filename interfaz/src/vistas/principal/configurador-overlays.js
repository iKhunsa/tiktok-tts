import { appSettings, saveSettings, applySettings } from '../../nucleo/estado/ajustes-app.js';
import { t } from '../../nucleo/i18n/i18n.js';
import { showToast } from '../../componentes/toast.js';
import { construirQuery } from '../../../compartido/estilo/query.js';
import { ESQUEMAS, DEFAULTS_OVERLAYS, CHATS_POR_PLATAFORMA } from '../../../compartido/estilo/esquemas.js';
import { trackUi } from '../../nucleo/telemetria-ui.js';
import { urlConVistaPrevia } from '../../../compartido/vista-previa.js';
import { EVENTOS_ALERTA } from '../../../compartido/eventos-alerta.js';
import { esCapaGif, urlCapaGif } from '../../../compartido/estilo/campos-gif.js';
import { queryEpik } from './epik/estado.js';

export function buildOverlayUrl(type) {
  if (esCapaGif(type)) return urlCapaGif(location.origin, appSettings.overlays[type]);
  // Con una skin .epik se suman sus ajustes propios (x.<clave>).
  const query = [construirQuery(ESQUEMAS[type], appSettings.overlays[type]), queryEpik(type)].filter(Boolean).join('&');
  // Las alertas de evento comparten pagina: ?evento= elige cual es.
  if (EVENTOS_ALERTA[type]) return `${location.origin}/overlay-evento.html?evento=${type}${query ? `&${query}` : ''}`;
  if (CHATS_POR_PLATAFORMA[type]) return `${location.origin}/overlay-chat.html?platforms=${CHATS_POR_PLATAFORMA[type]}${query ? `&${query}` : ''}`;
  const base = `${location.origin}/overlay-${type}.html`;
  return query ? `${base}?${query}` : base;
}

const RETARDO_VISTA_PREVIA_MS = 250;
const temporizadoresVistaPrevia = new Map();

// Recarga la vista previa con un pequeno retardo: arrastrar un slider dispara
// decenas de cambios y cada recarga abre el WebSocket del overlay de nuevo.
// Con la tarjeta plegada solo guarda la URL: 20 iframes abiertos serian 20 WebSockets.
function actualizarVistaPrevia(type, urlOverlay) {
  const marco = document.querySelector(`[data-preview="${type}"]`);
  if (!marco) return;
  const url = urlConVistaPrevia(urlOverlay); // solo el iframe lleva datos de ejemplo; la URL copiada no
  marco.dataset.url = url;
  clearTimeout(temporizadoresVistaPrevia.get(type));
  temporizadoresVistaPrevia.set(type, setTimeout(() => cargarVistaPrevia(marco), RETARDO_VISTA_PREVIA_MS));
}

function cargarVistaPrevia(marco) {
  const { url, muestra } = marco.dataset;
  const destino = muestra ? `${url}&muestra=${muestra}` : url;
  if (marco.closest('.cfg-card.abierta') && marco.src !== destino) marco.src = destino;
}

/** Cambia el dato de ejemplo de la vista previa; no toca los ajustes ni la URL de OBS. */
export function probarMuestra(marco, valor) {
  marco.dataset.muestra = valor;
  cargarVistaPrevia(marco);
}

/** Al abrir una tarjeta se carga su vista previa. */
export function alAbrirTarjetaOverlay(tarjeta) {
  const marco = tarjeta.querySelector('[data-preview]');
  if (marco) cargarVistaPrevia(marco);
}

/** Al salir de un overlay se descarga su iframe, que si no deja su WebSocket abierto. */
export function alCerrarTarjetaOverlay(tarjeta) {
  tarjeta.querySelector('[data-preview]')?.removeAttribute('src');
}

export function updateOverlayUrl(type) {
  const url = buildOverlayUrl(type);
  const urlEl = document.getElementById('cfg-url-' + type);
  const openEl = document.getElementById('cfg-open-' + type);
  if (urlEl) urlEl.textContent = url;
  if (openEl) openEl.href = url;
  actualizarVistaPrevia(type, url);
}

export function onCfgChange(type, field, value) {
  appSettings.overlays[type][field] = value;
  updateOverlayUrl(type);
  saveSettings();
}

export function copyCfgUrl(type) {
  navigator.clipboard
    .writeText(buildOverlayUrl(type))
    .then(() => { trackUi('ui:overlay-copied', type); showToast(t('toast.urlCopied')); })
    .catch(() => showToast(t('toast.copyError')));
}

export function updateFollowerDisplay(count) {
  const el = document.getElementById('cfg-seg-auto');
  if (el) el.textContent = count ? Number(count).toLocaleString('es') : t('label.connectToGet');
}

export async function testGiftAlert() {
  try {
    const res = await fetch('/api/test/gift', { method: 'POST' });
    const data = await res.json();
    if (data.success) showToast(t('toast.testAlertSent').replace('{name}', data.giftName));
    else showToast(t('toast.testError'));
  } catch (e) {
    showToast(t('toast.testError'));
  }
}

export async function testSocialAlert(eventType, platform) {
  try {
    const endpoint = eventType === 'follow'
      ? '/api/test/follow' + (platform ? `?platform=${platform}` : '')
      : '/api/test/share';
    const res = await fetch(endpoint, { method: 'POST' });
    const data = await res.json();
    if (data.success) showToast(t('toast.testSocialSent').replace('{type}', eventType).replace('{user}', data.user));
    else showToast(t('toast.testError'));
  } catch (e) {
    showToast(t('toast.testError'));
  }
}

async function testRanking(endpoint, sentKey) {
  try {
    const res = await fetch(endpoint, { method: 'POST' });
    const data = await res.json();
    if (data.success) showToast(t(sentKey).replace('{count}', data.count));
    else showToast(t('toast.testError'));
  } catch {
    showToast(t('toast.testError'));
  }
}

export const testTopLikers = () => testRanking('/api/test/likes', 'toast.testLikesSent');
export const testTopDonors = () => testRanking('/api/test/donors', 'toast.testDonorsSent');
export const testViewers = () => testRanking('/api/test/viewers', 'toast.testViewersSent');

async function enviarTest(endpoint, cuerpo, claveEnviado) {
  try {
    const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(cuerpo) });
    const data = await res.json();
    showToast(t(data.success ? claveEnviado : 'toast.testError'));
  } catch {
    showToast(t('toast.testError'));
  }
}

const testChat = (platform) => enviarTest('/api/test/chat', { platform, user: 'TestUser', comment: t('overlayCat.mensajePrueba') }, 'toast.testChatSent');
const testEvento = (evento) => enviarTest('/api/test/evento', { evento }, 'toast.testOverlaySent');

// Test de los overlays que no traen boton propio en index.html.
const TESTS_OVERLAY = {
  chat: () => testChat('tiktok'),
  seguidores: () => testSocialAlert('follow'),
  social: () => testSocialAlert('follow'),
  'nuevo-seguidor': () => testSocialAlert('follow'),
  compartido: () => testSocialAlert('share'),
  creditos: testGiftAlert,
  'contador-likes': testTopLikers,
  musica: () => testEvento({ type: 'music-test' }),
};

/** Si el overlay tiene un evento de prueba que lanzar (las capas GIF e imagenes no). */
export const tieneTest = (type) => !!(TESTS_OVERLAY[type] || CHATS_POR_PLATAFORMA[type] || EVENTOS_ALERTA[type]);

/** Lanza un evento de prueba que ve el overlay (en OBS y en la vista previa). */
export function probarOverlay(type) {
  if (TESTS_OVERLAY[type]) return TESTS_OVERLAY[type]();
  if (CHATS_POR_PLATAFORMA[type]) return testChat(CHATS_POR_PLATAFORMA[type]);
  if (EVENTOS_ALERTA[type]) return testEvento(EVENTOS_ALERTA[type].muestra);
}

export function restablecerOverlayDeFabrica(type) {
  appSettings.overlays[type] = JSON.parse(JSON.stringify(DEFAULTS_OVERLAYS[type]));
  saveSettings();
  applySettings();
  // Las capas GIF no son de las 25 que applySettings repinta: quien las dibuja se entera por este aviso.
  document.dispatchEvent(new window.CustomEvent('overlay:restablecido', { detail: { type } }));
  showToast(t('toast.overlayReset'));
}
