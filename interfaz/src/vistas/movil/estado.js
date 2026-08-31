/** Estado espejo del desktop, recibido por WS (state-sync) o HTTP
 * (fetchState al reconectar). El desktop es la fuente de verdad — este
 * modulo nunca infiere el estado localmente, solo lo refleja. */
export const state = {
  ttsGlobalEnabled: true,
  ttsPaused: false,
  streamTimerRunning: false,
  options: { readChat: true, readGifts: true, readJoins: true, readFollows: true, readLikes: true, readShares: true, sayUsername: true },
  clips: [],
  soundPads: [],
};

export function fetchState() {
  fetch('/api/mobile/state').then((r) => r.json()).then(applyState).catch(() => {});
}

// Los renders viven en modulos aparte (control.js, clips.js, soundpad.js);
// importados dinamicamente-por-referencia via setters para evitar un
// import circular de 3 vias — en su lugar cada uno se registra aca.
const renderCallbacks = [];
export function onApplyState(fn) { renderCallbacks.push(fn); }

export function applyState(s) {
  if (typeof s.ttsGlobalEnabled === 'boolean') state.ttsGlobalEnabled = s.ttsGlobalEnabled;
  if (typeof s.ttsPaused === 'boolean') state.ttsPaused = s.ttsPaused;
  if (typeof s.streamTimerRunning === 'boolean') state.streamTimerRunning = s.streamTimerRunning;
  if (s.options && typeof s.options === 'object') state.options = { ...state.options, ...s.options };
  if (Array.isArray(s.clips)) state.clips = s.clips;
  if (Array.isArray(s.soundPads)) state.soundPads = s.soundPads;
  renderCallbacks.forEach((fn) => fn());
}
