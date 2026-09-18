import { cargarLocaleOverlay, t, aplicarI18nOverlay } from './compartido/i18n-overlay.js';
import { leerParametros, aplicarParametrosVisuales } from './compartido/parametros.js';
import { conectarWSOverlay } from './compartido/ws-cliente.js';
import { registrarErroresOverlay } from './compartido/registrar-errores.js';
import { crearCreditos } from './compartido/creditos-agregados.js';

registrarErroresOverlay();

const params = leerParametros();
aplicarParametrosVisuales(params);
const _s = parseFloat(params.get('speed'));
const hasManualSpeed = Number.isFinite(_s) && _s > 0;
const baseSpeed = hasManualSpeed ? _s : 40;
if (hasManualSpeed) document.documentElement.style.setProperty('--speed', _s + 's');

const track = document.getElementById('track');
const credits = crearCreditos();
const RENDER_MS = 2000;
let ultimoRender = 0;
let renderTimer = null;

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

function renderTrack() {
  track.innerHTML = '';
  const sections = [];

  if (credits.donors.length) {
    sections.push({
      label: t('overlayStr.donations'),
      items: credits.donors.map((d) => ({ icon: '🎁', name: d.nombre, badge: [...d.regalos].map(([g, n]) => `x${n} ${g}`).join(', ') })),
    });
  }
  if (credits.followers.length) {
    sections.push({
      label: t('overlayStr.newFollowersSect'),
      items: credits.followers.map((f) => ({ icon: '💜', name: f.nombre, badge: '' })),
    });
  }
  if (credits.sharers.length) {
    sections.push({
      label: t('overlayStr.sharedSect'),
      items: credits.sharers.map((s) => ({ icon: '🔗', name: s.nombre, badge: '' })),
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
    if (d.credits) credits.cargar(d.credits);
    renderTrack();
  })
  .catch(() => renderTrack());

// Como mucho un render cada RENDER_MS: una rafaga de gifts/follows no
// reconstruye el DOM (y reinicia el scroll) por cada evento.
function pedirRender() {
  if (renderTimer) return;
  renderTimer = setTimeout(() => {
    renderTimer = null;
    ultimoRender = Date.now();
    renderTrack();
  }, Math.max(0, RENDER_MS - (Date.now() - ultimoRender)));
}

function alManejarMensaje(d) {
  if (d.type === 'gift') {
    credits.agregarDonante({ user: d.user, giftName: d.giftName, count: d.repeatCount || 1 });
    pedirRender();
  } else if (d.type === 'follow') {
    credits.agregarSeguidor({ user: d.user });
    pedirRender();
  } else if (d.type === 'share') {
    credits.agregarSharer({ user: d.user });
    pedirRender();
  } else if (d.type === 'connected' && d.isFirst) {
    credits.vaciar();
    pedirRender();
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
