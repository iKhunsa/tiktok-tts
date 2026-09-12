import { cargarLocaleOverlay, t, aplicarI18nOverlay } from './compartido/i18n-overlay.js';
import { leerParametros, aplicarParametrosVisuales } from './compartido/parametros.js';
import { conectarWSOverlay } from './compartido/ws-cliente.js';
import { registrarErroresOverlay } from './compartido/registrar-errores.js';

registrarErroresOverlay();

const params = leerParametros();
aplicarParametrosVisuales(params);
const _s = parseFloat(params.get('speed'));
const hasManualSpeed = Number.isFinite(_s) && _s > 0;
const baseSpeed = hasManualSpeed ? _s : 40;
if (hasManualSpeed) document.documentElement.style.setProperty('--speed', _s + 's');

const track = document.getElementById('track');
const MAX_CREDITS_PER_TYPE = 50;
let credits = { donors: [], followers: [], sharers: [] };

function buildRows(list) {
  return list.map((item) => {
    const row = document.createElement('div');
    row.className = 'credit-row';
    const icon = document.createElement('span');
    icon.className = 'credit-icon';
    icon.textContent = String(item.icon || '');
    const name = document.createElement('span');
    name.className = 'credit-name';
    name.textContent = String(item.name || '');
    row.append(icon, name);
    if (item.badge) {
      const badge = document.createElement('span');
      badge.className = 'credit-badge';
      badge.textContent = String(item.badge);
      row.appendChild(badge);
    }
    return row;
  });
}

function normalizeCredits(value) {
  return ['donors', 'followers', 'sharers'].reduce((result, type) => {
    result[type] = Array.isArray(value?.[type]) ? value[type].slice(-MAX_CREDITS_PER_TYPE) : [];
    return result;
  }, {});
}

function addCredit(type, value) {
  const list = credits[type];
  list.push(value);
  if (list.length > MAX_CREDITS_PER_TYPE) list.splice(0, list.length - MAX_CREDITS_PER_TYPE);
}

function renderTrack() {
  track.innerHTML = '';
  const sections = [];

  if (credits.donors.length) {
    sections.push({
      label: t('overlayStr.donations'),
      items: credits.donors.map((d) => ({ icon: '🎁', name: d.user, badge: `x${d.count} ${d.giftName}` })),
    });
  }
  if (credits.followers.length) {
    sections.push({
      label: t('overlayStr.newFollowersSect'),
      items: credits.followers.map((f) => ({ icon: '💜', name: f.user, badge: '' })),
    });
  }
  if (credits.sharers.length) {
    sections.push({
      label: t('overlayStr.sharedSect'),
      items: credits.sharers.map((s) => ({ icon: '🔗', name: s.user, badge: '' })),
    });
  }

  if (!sections.length) {
    const ph = document.createElement('div');
    ph.className = 'credit-row';
    const text = document.createElement('span');
    text.className = 'credit-name';
    text.style.cssText = 'color:rgba(255,255,255,0.3);text-align:center;width:100%';
    text.textContent = t('overlayStr.waitingEvents');
    ph.appendChild(text);
    track.appendChild(ph);
    return;
  }

  for (let pass = 0; pass < 2; pass++) {
    for (const sec of sections) {
      const hdr = document.createElement('div');
      hdr.className = 'section-header';
      hdr.textContent = sec.label;
      track.appendChild(hdr);
      for (const row of buildRows(sec.items)) track.appendChild(row);
      const div = document.createElement('div');
      div.className = 'divider-section';
      track.appendChild(div);
    }
  }
}

fetch('/api/overlay-stats')
  .then((r) => r.json())
  .then((d) => {
    if (d.credits) credits = normalizeCredits(d.credits);
    renderTrack();
  })
  .catch(() => renderTrack());

function alManejarMensaje(d) {
  if (d.type === 'gift') {
    addCredit('donors', { user: d.user, giftName: d.giftName, count: d.repeatCount || 1 });
    renderTrack();
  } else if (d.type === 'follow') {
    addCredit('followers', { user: d.user });
    renderTrack();
  } else if (d.type === 'share') {
    addCredit('sharers', { user: d.user });
    renderTrack();
  } else if (d.type === 'connected' && d.isFirst) {
    credits = { donors: [], followers: [], sharers: [] };
    renderTrack();
  } else if (d.type === 'config-updated') {
    aplicarA11y(d.config || {});
  }
}

// Reduce motion aca no detiene el scroll (es la funcion del overlay), solo
// lo hace mas lento para menor estimulacion — por eso no usa el modulo
// compartido de accesibilidad (que togglea la clase reduce-motion global).
function aplicarA11y(cfg) {
  if (hasManualSpeed) return;
  const speed = cfg.a11yReduceMotion ? baseSpeed * 1.6 : baseSpeed;
  document.documentElement.style.setProperty('--speed', speed + 's');
}
fetch('/api/config').then((r) => r.json()).then(aplicarA11y).catch(() => {});

cargarLocaleOverlay().then(() => {
  aplicarI18nOverlay();
  conectarWSOverlay(alManejarMensaje);
});
