import { esc } from './utils.js';

let chatCount = 0;
let userScrolled = false;

export function addChat(d) {
  const area = document.getElementById('tabChat');
  const empty = document.getElementById('chatEmpty');
  if (empty) empty.remove();

  chatCount++;
  if (chatCount > 100) {
    const first = area.querySelector('.chat-msg');
    if (first) first.remove();
  }

  const platClass = d.platform === 'twitch' ? 'plat-twitch' : d.platform === 'youtube' ? 'plat-youtube' : d.platform === 'kick' ? 'plat-kick' : 'plat-tiktok';
  const platLabel = d.platform === 'twitch' ? 'TW' : d.platform === 'youtube' ? 'YT' : d.platform === 'kick' ? 'KI' : 'TK';

  const el = document.createElement('div');
  el.className = 'chat-msg';
  el.innerHTML = `<span class="plat-badge ${platClass}">${platLabel}</span><div class="msg-body"><span class="msg-user">${esc(d.user)}</span> <span class="msg-text">${esc(d.comment || '')}</span></div>`;
  area.appendChild(el);

  if (!userScrolled) area.scrollTop = area.scrollHeight;
}

// Eventos (gift/follow/like/share/join): solo visualizacion, mismo feed.
// Nombres siempre escapados con esc() — sin riesgo de inyeccion.
export function addEvent(d, icon, text) {
  const area = document.getElementById('tabChat');
  const empty = document.getElementById('chatEmpty');
  if (empty) empty.remove();

  chatCount++;
  if (chatCount > 100) {
    const first = area.querySelector('.chat-msg');
    if (first) first.remove();
  }

  const el = document.createElement('div');
  el.className = 'chat-msg event';
  el.innerHTML = `<span class="evt-icon">${icon}</span><div class="msg-body"><span class="msg-user">${esc(d.user)}</span> <span class="msg-text evt-text">${esc(text)}</span></div>`;
  area.appendChild(el);

  if (!userScrolled) area.scrollTop = area.scrollHeight;
}

export function iniciarGuardaScroll() {
  document.getElementById('tabChat').addEventListener('scroll', () => {
    const a = document.getElementById('tabChat');
    userScrolled = a.scrollTop + a.clientHeight < a.scrollHeight - 60;
  });
}
