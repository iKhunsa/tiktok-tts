import { state, onApplyState } from './estado.js';
import { cmd } from './comandos.js';

const DEFAULT_PAD_COLOR = '#3ecf8e';

function safePadColor(color) {
  const value = String(color || '');
  return /^#[0-9a-f]{6}$/i.test(value) ? value : DEFAULT_PAD_COLOR;
}

export function renderPad() {
  const grid = document.getElementById('padGrid');
  const empty = document.getElementById('padEmpty');
  if (!grid) return;
  const pads = Array.isArray(state.soundPads) ? state.soundPads : [];
  if (!pads.length) {
    grid.replaceChildren();
    if (empty) empty.style.display = '';
    return;
  }
  if (empty) empty.style.display = 'none';
  const fragment = document.createDocumentFragment();
  for (const sound of pads) {
    const button = document.createElement('button');
    const soundId = String(sound?.id || '');
    button.type = 'button';
    button.className = 'pad-btn';
    button.style.backgroundColor = safePadColor(sound?.color);
    button.textContent = String(sound?.name || '');
    button.disabled = !soundId;
    if (soundId) button.addEventListener('click', () => padPlay(soundId));
    fragment.appendChild(button);
  }
  grid.replaceChildren(fragment);
}

onApplyState(renderPad);

export function padPlay(soundId) {
  cmd('soundpadPlay', { soundId });
}
