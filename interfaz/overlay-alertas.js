import { cargarLocaleOverlay, t, aplicarI18nOverlay } from './compartido/i18n-overlay.js';
import { leerParametros, aplicarParametrosVisuales, intParam } from './compartido/parametros.js';
import { conectarWSOverlay } from './compartido/ws-cliente.js';
import { iniciarAccesibilidadOverlay } from './compartido/accesibilidad.js';
import { registrarErroresOverlay } from './compartido/registrar-errores.js';
import { escaparHtml } from './compartido/escapar-html.js';
import { crearColaAlertas, programarRetiro, PLATFORM_META } from './compartido/cola-alertas.js';

registrarErroresOverlay();
const params = leerParametros();
aplicarParametrosVisuales(params);
const alertDur = intParam(params, 'dur', 4000);
const userSetColor = !!params.get('color');
let giftMap = new Map();
let giftDict = {};

function normalizeStr(str) { return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''); }

fetch('/gift-dict.json').then((r) => r.json()).then((dict) => {
  giftDict = Object.fromEntries(Object.entries(dict).map(([k, v]) => [normalizeStr(k), v]));
}).catch(() => {});
fetch('/api/gifts-list').then((r) => r.json()).then((files) => {
  giftMap = new Map(files.flatMap((f) => {
    const match = f.match(/^\d+_(.+)\.png$/i);
    if (!match) return [];
    const slug = normalizeStr(match[1]);
    return [[slug, f], [slug.replace(/_/g, ''), f]];
  }));
}).catch(() => {});

function resolveGiftImage(giftName) {
  if (!giftName) return null;
  const normalized = normalizeStr(giftName);
  if (giftDict[normalized]) return '/gifts/' + giftDict[normalized];
  if (giftMap.has(normalized)) return '/gifts/' + giftMap.get(normalized);
  for (const [slug, fname] of giftMap) if (slug.includes(normalized) || normalized.includes(slug)) return '/gifts/' + fname;
  return null;
}

function useEmojiFor(el) {
  const span = document.createElement('span');
  span.className = 'gift-fallback';
  span.textContent = '🎁';
  if (el.isConnected) el.replaceWith(span);
  return span;
}

function showGenericAlert(d, done) {
  if (d.type !== 'superchat') { done(); return; }
  const meta = PLATFORM_META[d.platform] || PLATFORM_META.tiktok;
  const card = document.createElement('div');
  card.className = 'alert-card';
  if (!userSetColor) card.style.setProperty('--accent', meta.color);
  card.innerHTML = `<span class="gift-fallback">💰</span><div class="info"><div class="action-label">${meta.label} · SUPERCHAT</div><div class="gift-name">${escaparHtml(d.user || t('overlayStr.anonymous'))}</div>${d.comment ? `<div class="username">${escaparHtml(d.comment)}</div>` : ''}</div>${d.amount ? `<div class="qty-badge">${escaparHtml(d.amount)}</div>` : ''}`;
  document.body.appendChild(card);
  programarRetiro(card, d.duration || alertDur, done);
}

function showAlert(gift, done) {
  if (gift.type && gift.type !== 'gift') { showGenericAlert(gift, done); return; }
  const imgSrc = resolveGiftImage(gift.giftName || '');
  const cdnSrc = gift.giftPictureUrl || '';
  const card = document.createElement('div');
  card.className = 'alert-card';
  const img = document.createElement('img');
  img.className = 'gift-img';
  img.alt = gift.giftName;
  if (imgSrc) { img.src = imgSrc; img.onerror = () => { if (cdnSrc) { img.src = cdnSrc; img.onerror = () => useEmojiFor(img); } else useEmojiFor(img); }; }
  else if (cdnSrc) { img.src = cdnSrc; img.onerror = () => useEmojiFor(img); }
  card.appendChild(imgSrc || cdnSrc ? img : useEmojiFor(img));
  const info = document.createElement('div');
  info.className = 'info';
  info.innerHTML = `<div class="action-label">${t('overlayStr.giftReceived')}</div><div class="gift-name">${escaparHtml(gift.giftName)}</div><div class="username">${t('overlayStr.giftFrom', { user: escaparHtml(gift.user) })}</div>${gift.usdValue ? `<div class="usd-value">≈ $${escaparHtml(String(gift.usdValue))} USD</div>` : ''}`;
  card.appendChild(info);
  if ((gift.repeatCount || 1) > 1) { const badge = document.createElement('div'); badge.className = 'qty-badge'; badge.textContent = 'x' + gift.repeatCount; card.appendChild(badge); }
  document.body.appendChild(card);
  programarRetiro(card, gift.duration || alertDur, done);
}

const cola = crearColaAlertas(showAlert);
const aplicarA11y = iniciarAccesibilidadOverlay();
cargarLocaleOverlay().then(() => {
  aplicarI18nOverlay();
  conectarWSOverlay((d) => {
    if (['gift', 'superchat'].includes(d.type)) cola.encolar(d);
    else if (d.type === 'config-updated') aplicarA11y(d.config || {});
  });
});
