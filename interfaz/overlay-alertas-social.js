import { cargarLocaleOverlay, t, aplicarI18nOverlay } from './compartido/i18n-overlay.js';
import { leerParametros, aplicarParametrosVisuales, intParam, strParam } from './compartido/parametros.js';
import { conectarWSOverlay } from './compartido/ws-cliente.js';
import { iniciarAccesibilidadOverlay } from './compartido/accesibilidad.js';
import { registrarErroresOverlay } from './compartido/registrar-errores.js';
import { escaparHtml } from './compartido/escapar-html.js';
import { crearColaAlertas, programarRetiro } from './compartido/cola-alertas.js';

registrarErroresOverlay();

const params = leerParametros();
aplicarParametrosVisuales(params);
const alertDur = intParam(params, 'dur', 4000);
const followImg = strParam(params, 'followImg', '');
const shareImg = strParam(params, 'shareImg', '');
const userSetColor = !!params.get('color');

// PLATFORM_META aca es distinto al de overlay-alertas.js (agrega tiktok con
// otro color de marca): esta tarjeta la puede disparar follow/share desde
// cualquier plataforma, no solo eventos con "meta" propio como sub/cheer.
const PLATFORM_META = {
  tiktok: { label: 'TIKTOK', color: '#ff0050' },
  twitch: { label: 'TWITCH', color: '#9146FF' },
  youtube: { label: 'YOUTUBE', color: '#FF0000' },
};

function makeDefaultIcon(isFollow) {
  const d = document.createElement('div');
  d.className = 'event-emoji';
  d.textContent = isFollow ? '💜' : '🔗';
  return d;
}

function showAlert(event, alTerminar) {
  const isFollow = event.type === 'follow';
  const meta = PLATFORM_META[event.platform] || null;
  const card = document.createElement('div');
  card.className = 'alert-card';
  if (meta && !userSetColor) card.style.setProperty('--accent', meta.color);

  const customImg = isFollow ? followImg : shareImg;
  if (customImg) {
    const img = document.createElement('img');
    img.className = 'event-img';
    img.src = customImg;
    img.alt = isFollow ? 'follow' : 'share';
    img.onerror = () => { img.replaceWith(makeDefaultIcon(isFollow)); };
    card.appendChild(img);
  } else {
    card.appendChild(makeDefaultIcon(isFollow));
  }

  const info = document.createElement('div');
  info.className = 'info';
  const platPrefix = meta ? `${meta.label} · ` : '';
  info.innerHTML = `
    <div class="action-label">${platPrefix}${isFollow ? t('overlayStr.newFollower') : t('overlayStr.shared')}</div>
    <div class="event-name">${escaparHtml(event.username || event.user || t('overlayStr.someone'))}</div>
    <div class="username">${isFollow ? t('overlayStr.followed') : t('overlayStr.sharedStream')}</div>
  `;
  card.appendChild(info);

  const badge = document.createElement('div');
  badge.className = 'type-badge';
  badge.textContent = isFollow ? '💜 Follow' : '🔗 Share';
  card.appendChild(badge);

  document.body.appendChild(card);
  programarRetiro(card, event.duration || alertDur, alTerminar);
}

const cola = crearColaAlertas(showAlert);

function alManejarMensaje(d) {
  if (d.type === 'follow' || d.type === 'share') cola.encolar(d);
  else if (d.type === 'config-updated') aplicarA11y(d.config || {});
}

const aplicarA11y = iniciarAccesibilidadOverlay();

cargarLocaleOverlay().then(() => {
  aplicarI18nOverlay();
  conectarWSOverlay(alManejarMensaje);
});
