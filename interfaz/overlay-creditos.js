import { cargarLocaleOverlay, t, aplicarI18nOverlay } from './compartido/i18n-overlay.js';
import { leerParametros, aplicarParametrosVisuales } from './compartido/parametros.js';
import { conectarWSOverlay } from './compartido/ws-cliente.js';
import { registrarErroresOverlay } from './compartido/registrar-errores.js';
import { escaparHtml } from './compartido/escapar-html.js';

registrarErroresOverlay();

const params = leerParametros();
aplicarParametrosVisuales(params);
const _s = parseFloat(params.get('speed'));
const hasManualSpeed = Number.isFinite(_s) && _s > 0;
const baseSpeed = hasManualSpeed ? _s : 40;
if (hasManualSpeed) document.documentElement.style.setProperty('--speed', _s + 's');

const track = document.getElementById('track');
let credits = { donors: [], followers: [], sharers: [] };

function buildRows(list) {
  return list.map((item) => {
    const row = document.createElement('div');
    row.className = 'credit-row';
    row.innerHTML = `
      <span class="credit-icon">${item.icon}</span>
      <span class="credit-name">${escaparHtml(item.name)}</span>
      ${item.badge ? `<span class="credit-badge">${escaparHtml(item.badge)}</span>` : ''}
    `;
    return row;
  });
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
    ph.innerHTML = `<span class="credit-name" style="color:rgba(255,255,255,0.3);text-align:center;width:100%">${t('overlayStr.waitingEvents')}</span>`;
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
    if (d.credits) credits = d.credits;
    renderTrack();
  })
  .catch(() => renderTrack());

function alManejarMensaje(d) {
  if (d.type === 'gift') {
    credits.donors.push({ user: d.user, giftName: d.giftName, count: d.repeatCount || 1 });
    renderTrack();
  } else if (d.type === 'follow') {
    credits.followers.push({ user: d.user });
    renderTrack();
  } else if (d.type === 'share') {
    credits.sharers.push({ user: d.user });
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
