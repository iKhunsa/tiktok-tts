import { leerParametros, aplicarParametrosVisuales, intParam } from './compartido/parametros.js';
import { conectarWSOverlay } from './compartido/ws-cliente.js';
import { registrarErroresOverlay } from './compartido/registrar-errores.js';
import { escaparHtml } from './compartido/escapar-html.js';

registrarErroresOverlay();

const PLATFORM_LABEL = { tiktok: 'T', twitch: 'W', youtube: 'Y', kick: 'K' };
const params = leerParametros();
aplicarParametrosVisuales(params);

const _s = parseFloat(params.get('size'));
const hasManualSize = Number.isFinite(_s) && _s > 0;
if (hasManualSize) document.documentElement.style.setProperty('--font-size', _s + 'px');

const maxMsgs = intParam(params, 'maxmsgs', 30);
const showUsers = params.get('usernames') !== '0';
const filterRaw = params.get('platforms') || 'tiktok,twitch,youtube,kick';
const allowedPlatforms = new Set(filterRaw.split(',').map((s) => s.trim().toLowerCase()));

const container = document.getElementById('chat-container');

function renderText(text, emotes) {
  if (!emotes || Object.keys(emotes).length === 0) return escaparHtml(text);
  const parts = text.split(/(:[a-zA-Z0-9_\-]+:)/g);
  return parts
    .map((part) => {
      const m = part.match(/^:([\w-]+):$/);
      if (m && emotes[m[1]]?.url) {
        return `<img src="${escaparHtml(emotes[m[1]].url)}" alt="${escaparHtml(m[1])}" class="chat-emote">`;
      }
      if (emotes[part]?.url) {
        return `<img src="${escaparHtml(emotes[part].url)}" alt="${escaparHtml(part)}" class="chat-emote">`;
      }
      return escaparHtml(part);
    })
    .join('');
}

function addMessage(data) {
  if (!allowedPlatforms.has(data.platform)) return;

  const msg = document.createElement('div');
  msg.className = 'msg';

  const dot = document.createElement('span');
  dot.className = `platform-dot dot-${data.platform}`;
  dot.textContent = PLATFORM_LABEL[data.platform] || '';
  msg.appendChild(dot);

  const body = document.createElement('div');
  body.className = 'msg-body';

  if (showUsers) {
    const user = document.createElement('span');
    user.className = 'msg-user';
    user.textContent = data.user;
    const sep = document.createElement('span');
    sep.className = 'msg-sep';
    sep.textContent = ':';
    body.appendChild(user);
    body.appendChild(sep);
  }

  const text = document.createElement('span');
  text.className = 'msg-text';
  text.innerHTML = renderText(data.comment, data.emotes);
  body.appendChild(text);

  msg.appendChild(body);
  container.appendChild(msg);

  while (container.children.length > maxMsgs) container.removeChild(container.firstChild);
}

function alManejarMensaje(d) {
  if (d.type === 'chat') addMessage(d);
  else if (d.type === 'config-updated') aplicarA11y(d.config || {});
}

// overlay-chat tiene su propia regla de fuente (--font-size escalado por
// a11yUiFontScale), distinta del resto de overlays — no usa el modulo
// compartido de accesibilidad.
function aplicarA11y(cfg) {
  document.body.classList.toggle('reduce-motion', !!cfg.a11yReduceMotion);
  if (!hasManualSize && cfg.a11yUiFontScale) {
    document.documentElement.style.setProperty('--font-size', 14 * cfg.a11yUiFontScale + 'px');
  }
}

fetch('/api/config').then((r) => r.json()).then(aplicarA11y).catch(() => {});
conectarWSOverlay(alManejarMensaje);
