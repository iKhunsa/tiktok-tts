import { appSettings, saveSettings, applySettings } from '../../nucleo/estado/ajustes-app.js';
import { t } from '../../nucleo/i18n/i18n.js';
import { showToast } from '../../componentes/toast.js';
import { construirQuery } from '../../../compartido/estilo/query.js';
import { ESQUEMAS, DEFAULTS_OVERLAYS } from '../../../compartido/estilo/esquemas.js';

export function buildOverlayUrl(type) {
  const base = `${location.origin}/overlay-${type}.html`;
  const query = construirQuery(ESQUEMAS[type], appSettings.overlays[type]);
  return query ? `${base}?${query}` : base;
}

const RETARDO_VISTA_PREVIA_MS = 250;
const temporizadoresVistaPrevia = new Map();

// Recarga la vista previa con un pequeno retardo: arrastrar un slider dispara
// decenas de cambios y cada recarga abre el WebSocket del overlay de nuevo.
function actualizarVistaPrevia(type, url) {
  const marco = document.querySelector(`[data-preview="${type}"]`);
  if (!marco) return;
  clearTimeout(temporizadoresVistaPrevia.get(type));
  temporizadoresVistaPrevia.set(type, setTimeout(() => { if (marco.src !== url) marco.src = url; }, RETARDO_VISTA_PREVIA_MS));
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
    .then(() => showToast(t('toast.urlCopied')))
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

// Un mensaje por plataforma y por rol, para ver el logo y el estilo de cada uno.
// TikTok no informa moderadores, asi que ese rol se simula desde las demas.
const MENSAJES_PRUEBA_CHAT = [
  { platform: 'tiktok', user: 'ViewerAna', comment: 'Hola a todos!' },
  { platform: 'tiktok', user: 'SuscriptorMia', comment: 'Gracias por el directo!', role: 'subscriber' },
  { platform: 'twitch', user: 'ModeradorLeo', comment: 'Recuerden respetar las reglas', role: 'moderator' },
  { platform: 'youtube', user: 'MiembroSofi', comment: 'Saludos desde YouTube', role: 'subscriber' },
  { platform: 'kick', user: 'ViewerMax', comment: 'Buen stream!' },
];

// Secuencial (no Promise.all) para que los mensajes lleguen en el orden de la lista.
export async function testChatOverlay() {
  try {
    for (const mensaje of MENSAJES_PRUEBA_CHAT) {
      const respuesta = await fetch('/api/test/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mensaje),
      });
      if (!respuesta.ok) throw new Error(`test/chat ${respuesta.status}`);
    }
    showToast(t('toast.testChatSent'));
  } catch {
    showToast(t('toast.testError'));
  }
}

const CONFIRMACION_MS = 3000;

// Dos clics para no perder ajustes por accidente: el primero pide confirmar
// (el boton cambia de texto unos segundos), el segundo restablece.
export function restablecerOverlay(type, boton) {
  if (boton.dataset.confirmar) return aplicarRestablecer(type, boton);
  boton.dataset.confirmar = '1';
  boton.querySelector('span').textContent = t('btn.resetConfirm');
  setTimeout(() => cancelarConfirmacion(boton), CONFIRMACION_MS);
}

function cancelarConfirmacion(boton) {
  delete boton.dataset.confirmar;
  boton.querySelector('span').textContent = t('btn.reset');
}

function aplicarRestablecer(type, boton) {
  cancelarConfirmacion(boton);
  appSettings.overlays[type] = JSON.parse(JSON.stringify(DEFAULTS_OVERLAYS[type]));
  saveSettings();
  applySettings();
  showToast(t('toast.overlayReset'));
}
