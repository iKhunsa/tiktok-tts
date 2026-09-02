import { escHtml } from './utils.js';
import { state, onApplyState } from './estado.js';
import { cmd } from './comandos.js';

export function renderPad() {
  const grid = document.getElementById('padGrid');
  const empty = document.getElementById('padEmpty');
  if (!grid) return;
  const pads = state.soundPads || [];
  if (!pads.length) {
    grid.innerHTML = '';
    if (empty) empty.style.display = '';
    return;
  }
  if (empty) empty.style.display = 'none';
  grid.innerHTML = pads.map((s) =>
    `<button class="pad-btn" style="background:${escHtml(s.color)}" onclick="padPlay('${escHtml(s.id)}')">${escHtml(s.name)}</button>`,
  ).join('');
}

onApplyState(renderPad);

export function padPlay(soundId) {
  cmd('soundpadPlay', { soundId });
}
