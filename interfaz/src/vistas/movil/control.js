import { t } from '../../nucleo/i18n/i18n.js';
import { state, onApplyState } from './estado.js';
import { cmd } from './comandos.js';

export function renderControl() {
  // Global TTS
  const gb = document.getElementById('btnGlobalTTS');
  if (state.ttsGlobalEnabled) {
    gb.textContent = t('mobile3.ttsOn');
    gb.classList.remove('off');
  } else {
    gb.textContent = t('mobile3.ttsOff');
    gb.classList.add('off');
  }

  // Pause
  const pb = document.getElementById('btnPause');
  if (state.ttsPaused) {
    pb.classList.add('pause-active');
    pb.innerHTML = `<span class="act-icon">▶️</span>${t('mobile3.resume')}`;
  } else {
    pb.classList.remove('pause-active');
    pb.innerHTML = `<span class="act-icon">⏸</span>${t('mobile3.pause')}`;
  }

  // Chips
  const MAP = {
    readChat: 'chip-readChat', readGifts: 'chip-readGifts', readJoins: 'chip-readJoins',
    readFollows: 'chip-readFollows', readLikes: 'chip-readLikes', readShares: 'chip-readShares', sayUsername: 'chip-sayUsername',
  };
  for (const [k, id] of Object.entries(MAP)) {
    document.getElementById(id)?.classList.toggle('active', !!state.options[k]);
  }

  // Mark clip button
  const mc = document.getElementById('btnMarkClip');
  mc.disabled = !state.streamTimerRunning;
  mc.classList.toggle('timer-on', state.streamTimerRunning);
}

onApplyState(renderControl);

export function toggleGlobal() { cmd('globalTTS', { value: !state.ttsGlobalEnabled }); }
export function togglePause() { cmd('pause', { value: !state.ttsPaused }); }
export function toggleChip(key) { cmd('toggle', { key, value: !state.options[key] }); }
