import { t } from '../../nucleo/i18n/i18n.js';
import { esc } from './utils.js';
import { state, onApplyState } from './estado.js';
import { getActiveTab } from './tabs.js';
import { cmd } from './comandos.js';

let prevClipCount = 0;

export function renderClips() {
  const list = document.getElementById('clipList');
  const empty = document.getElementById('clipsEmpty');
  const badge = document.getElementById('clipsBadge');

  const clips = state.clips;
  empty.style.display = clips.length ? 'none' : 'block';

  list.innerHTML = clips.length
    ? `<div class="clips-day-header">${t('mobile3.today')} — ${clips.length} ${clips.length !== 1 ? t('mobile3.marks') : t('mobile3.mark')}</div>` +
      clips.map((c) => `
        <div class="clip-item">
          <div class="clip-left">
            <span class="clip-icon">🎬</span>
            <div class="clip-times">
              <span class="clip-elapsed">${esc(c.elapsed || '--:--')}</span>
              ${c.absoluteTime ? `<span class="clip-abs">${esc(c.absoluteTime)}</span>` : ''}
            </div>
          </div>
          <button class="clip-del" data-clip-id="${esc(String(c.id))}" onclick="deleteClip(this.dataset.clipId)" aria-label="${t('mobile3.deleteAria')}">×</button>
        </div>
      `).join('')
    : '';

  // Badge on Clips tab
  if (clips.length > prevClipCount && getActiveTab() !== 'Clips') {
    badge.textContent = clips.length;
    badge.classList.add('show');
  }
  prevClipCount = clips.length;
}

onApplyState(renderClips);

// Borrado por id (no por indice): inmune a desplazamientos cuando el
// desktop inserta un clip nuevo (unshift) entre el render y el comando.
export function deleteClip(clipId) { cmd('deleteClip', { clipId: String(clipId) }); }
