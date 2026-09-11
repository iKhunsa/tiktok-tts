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

fetch('/gift-dict.json')
  .then((r) => r.json())
  .then((dict) => {
    const normalized = {};
    for (const [k, v] of Object.entries(dict)) normalized[normalizeStr(k)] = v;
    giftDict = normalized;
  })
  .catch(() => {});

function normalizeStr(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function buildGiftMap(files) {
  const m = new Map();
  for (const f of files) {
    const match = f.match(/^\d+_(.+)\.png$/i);
    if (match) {
      const slug = normalizeStr(match[1]);
      m.set(slug, f);
      const slugNoUnderscore = slug.replace(/_/g, '');
      if (slugNoUnderscore !== slug) m.set(slugNoUnderscore, f);
    }
  }
  return m;
}

function resolveGiftImage(giftName) {
  if (!giftName) return null;
  const normalized = normalizeStr(giftName);
  if (giftDict[normalized]) return '/gifts/' + giftDict[normalized];
  if (giftMap.has(normalized)) return '/gifts/' + giftMap.get(normalized);
  for (const [slug, fname] of giftMap) {
    if (slug.includes(normalized) || normalized.includes(slug)) return '/gifts/' + fname;
  }
  return null;
}

fetch('/api/gifts-list')
  .then((r) => r.json())
  .then((files) => { giftMap = buildGiftMap(files); })
  .catch(() => {});

function useEmojiFor(el) {
  const span = document.createElement('span');
  span.className = 'gift-fallback';
  span.textContent = '🎁';
  if (el.isConnected) el.replaceWith(span);
  return span;
}

// action: 'BITS'/'RAID'/'SUPERCHAT' y PLATFORM_META son nombres de
// funcion/marca de la plataforma (como "Live") — se dejan sin traducir a
// proposito, no es un olvido de i18n.
function describeEvent(d) {
  switch (d.type) {
    case 'sub': {
      const tierTxt = d.isPrime
        ? t('overlayStr.tierPrime')
        : d.tierLabel || (d.tier ? t('overlayStr.tierLabel', { tier: d.tier }) : t('overlayStr.tierGeneric'));
      if (d.subType === 'resub') return { emoji: '🟣', action: t('overlayStr.subResub'), title: d.user, sub: d.months ? t('overlayStr.subMonths', { months: d.months }) : tierTxt, badge: d.months ? `x${d.months}` : null };
      if (d.subType === 'gift') return { emoji: '🎁', action: t('overlayStr.subGifted'), title: d.user, sub: d.recipient ? t('overlayStr.subGiftedTo', { recipient: d.recipient }) : tierTxt, badge: null };
      if (d.subType === 'mysterygift') return { emoji: '🎁', action: t('overlayStr.subsGifted'), title: d.user, sub: t('overlayStr.subsGiftedCount', { count: d.giftCount || 1 }), badge: `x${d.giftCount || 1}` };
      if (d.subType === 'upgrade') return { emoji: '⬆️', action: t('overlayStr.subUpgrade'), title: d.user, sub: tierTxt, badge: null };
      return { emoji: '🟣', action: t('overlayStr.subNew'), title: d.user, sub: tierTxt, badge: null };
    }
    case 'cheer':
      return { emoji: '💎', action: 'BITS', title: d.user, sub: d.message || '', badge: `${d.bits || 0} bits` };
    case 'raid':
      return { emoji: '🚀', action: 'RAID', title: d.user, sub: t('overlayStr.raidJoined'), badge: `${d.viewers || 0} viewers` };
    case 'superchat':
      return { emoji: '💰', action: 'SUPERCHAT', title: d.user, sub: d.comment || '', badge: d.amount || null };
    default:
      return null;
  }
}

function showGenericAlert(d, alTerminar) {
  const meta = PLATFORM_META[d.platform] || PLATFORM_META.tiktok;
  const desc = describeEvent(d);
  if (!desc) { alTerminar(); return; }
  const card = document.createElement('div');
  card.className = 'alert-card';
  if (!userSetColor) card.style.setProperty('--accent', meta.color);

  const icon = document.createElement('span');
  icon.className = 'gift-fallback';
  icon.textContent = desc.emoji;
  card.appendChild(icon);

  const info = document.createElement('div');
  info.className = 'info';
  info.innerHTML = `
    <div class="action-label">${meta.label} · ${desc.action}</div>
    <div class="gift-name">${escaparHtml(desc.title || t('overlayStr.anonymous'))}</div>
    ${desc.sub ? `<div class="username">${escaparHtml(desc.sub)}</div>` : ''}
  `;
  card.appendChild(info);

  if (desc.badge) {
    const badge = document.createElement('div');
    badge.className = 'qty-badge';
    badge.textContent = desc.badge;
    card.appendChild(badge);
  }

  document.body.appendChild(card);
  programarRetiro(card, d.duration || alertDur, alTerminar);
}

function showAlert(gift, alTerminar) {
  if (gift.type && gift.type !== 'gift') { showGenericAlert(gift, alTerminar); return; }

  const imgSrc = resolveGiftImage(gift.giftName || '');
  const cdnSrc = gift.giftPictureUrl || '';
  const card = document.createElement('div');
  card.className = 'alert-card';

  const img = document.createElement('img');
  img.className = 'gift-img';
  img.alt = gift.giftName;
  if (imgSrc) {
    img.src = imgSrc;
    img.onerror = () => {
      if (cdnSrc) { img.src = cdnSrc; img.onerror = () => useEmojiFor(img); }
      else useEmojiFor(img);
    };
  } else if (cdnSrc) {
    img.src = cdnSrc;
    img.onerror = () => useEmojiFor(img);
  }
  card.appendChild(imgSrc || cdnSrc ? img : useEmojiFor(img));

  const info = document.createElement('div');
  info.className = 'info';
  info.innerHTML = `
    <div class="action-label">${t('overlayStr.giftReceived')}</div>
    <div class="gift-name">${escaparHtml(gift.giftName)}</div>
    <div class="username">${t('overlayStr.giftFrom', { user: escaparHtml(gift.user) })}</div>
    ${gift.usdValue ? `<div class="usd-value">≈ $${escaparHtml(String(gift.usdValue))} USD</div>` : ''}
  `;
  card.appendChild(info);

  if ((gift.repeatCount || 1) > 1) {
    const badge = document.createElement('div');
    badge.className = 'qty-badge';
    badge.textContent = 'x' + gift.repeatCount;
    card.appendChild(badge);
  }

  document.body.appendChild(card);
  programarRetiro(card, gift.duration || alertDur, alTerminar);
}

const cola = crearColaAlertas(showAlert);

function alManejarMensaje(d) {
  if (['gift', 'sub', 'cheer', 'raid', 'superchat'].includes(d.type)) cola.encolar(d);
  else if (d.type === 'config-updated') aplicarA11y(d.config || {});
}

const aplicarA11y = iniciarAccesibilidadOverlay();

cargarLocaleOverlay().then(() => {
  aplicarI18nOverlay();
  conectarWSOverlay(alManejarMensaje);
});
