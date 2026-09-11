/**
 * Cola TTS ordenada por timestamp (no por llegada al cliente) + reproduccion
 * de audio + estado global de habilitado/pausado. Es el nucleo mas
 * sensible de la app: portado 1:1 desde index.html (secciones STATE,
 * AUDIO, SPEECH QUEUE y el togglePauseTts de PAUSE TTS), sin refactor de
 * logica — solo se separaron las dependencias en imports explicitos.
 *
 * `ws` se importa de cliente-ws.js para sendStateSync(); ese modulo a su
 * vez importa `speak`/`processQueue`/etc de aca para handleMessage(). Es
 * circular a proposito y seguro: todas las llamadas cruzadas ocurren
 * dentro de cuerpos de funcion, nunca en el top-level de ningun modulo.
 */
import { appSettings, saveSettings, ttsRate, ttsVol, setTtsRate, setTtsVol, applySettings } from '../estado/ajustes-app.js';
import { options } from '../estado/opciones-lectura.js';
import { t } from '../i18n/i18n.js';
import { showToast } from '../../componentes/toast.js';
import { logStorage } from '../log-storage.js';
import { getWs } from '../ws/cliente-ws.js';
import { getClipsData, getLocalDateStr, obtenerStreamStartTime } from '../../vistas/principal/clips.js';
import { chatFollowSpeaking } from '../../vistas/principal/chat-ui.js';
import { MAX_QUEUE_SIZE } from '../estado/config-runtime.js';

export let ttsGlobalEnabled = true;
export let ttsPaused = false;
export let isSpeaking = false;
export let currentMsgId = null;
export let speechQueue = [];
let activeAudio = null;
let ttsDroppedCount = 0;
let ttsErrorCount = 0;
let ttsAbortController = null;
const TTS_MAX_ERRORS = 5;

// Serializacion de processQueue: es async y toca estado global compartido
// (isSpeaking, speechQueue, activeAudio, ttsAbortController). Sin este lock,
// el spam de "saltar" dispara N ejecuciones solapadas → voces superpuestas,
// cola vaciada de golpe, AbortController huerfano. `queueDirty` recuerda que
// llego un pump mientras estabamos ocupados, para re-pumpear una sola vez al
// terminar.
let queuePumping = false;
let queueDirty = false;
// Coalesce de re-arranques de cola por rafaga de skips (cada skip ya aborta
// su request en stopCurrentTTS; esto solo agrupa el processQueue posterior).
let skipPumpTimer = null;

// Conservado por compat con el marcado antiguo (.tts-switch.on anima por
// CSS); ya no hay timer en el hilo principal.
let _ttsBarTimer = null;
function _ttsBarsInit() {
  const box = document.getElementById('ttsBars');
  if (box && !box.children.length) {
    for (let i = 0; i < 6; i++) box.appendChild(document.createElement('i'));
  }
}
function _ttsBarsAnimate() { _ttsBarsInit(); }
function _ttsBarsStop() {}

export function renderGlobalTTSButton() {
  const btn = document.getElementById('btnTTSToggle');
  if (!btn) return;
  btn.classList.toggle('on', ttsGlobalEnabled);
  btn.setAttribute('aria-pressed', ttsGlobalEnabled ? 'true' : 'false');
  const titleKey = ttsGlobalEnabled ? 'tts.on' : 'tts.off';
  btn.dataset.i18nTitle = titleKey;
  btn.title = t(titleKey);
  _ttsBarsInit();
  if (ttsGlobalEnabled) { if (!_ttsBarTimer) _ttsBarsAnimate(); }
  else _ttsBarsStop();
}

/** Usado por el remote-cmd 'globalTTS' (movil manda el valor explicito,
 * no un toggle) — a diferencia de toggleGlobalTTS() de abajo, que invierte. */
export function setTtsGlobalEnabled(value) {
  ttsGlobalEnabled = !!value;
  renderGlobalTTSButton();
}

export function toggleGlobalTTS() {
  ttsGlobalEnabled = !ttsGlobalEnabled;
  sendStateSync();
  renderGlobalTTSButton();
  if (!ttsGlobalEnabled && isSpeaking) {
    stopCurrentTTS({ clearQueue: true });
  }
  if (ttsGlobalEnabled && !ttsPaused && !isSpeaking && speechQueue.length > 0) {
    processQueue();
  }
}

export function togglePauseTts() {
  ttsPaused = !ttsPaused;
  sendStateSync();
  const btn = document.getElementById('btnPauseTTS');
  if (btn) {
    btn.textContent = ttsPaused ? t('btn.resumeTTS') : t('btn.pauseTTS');
    btn.style.borderColor = ttsPaused ? '#3ecf8e' : 'var(--accent)';
    btn.style.background = ttsPaused ? 'rgba(62,207,142,0.12)' : 'rgba(240,33,58,0.12)';
    btn.style.color = ttsPaused ? '#3ecf8e' : 'var(--accent)';
  }
  if (ttsPaused) {
    if (activeAudio) activeAudio.pause();
  } else {
    if (activeAudio && activeAudio.paused) {
      activeAudio.play().catch(() => processQueue());
    } else if (!isSpeaking) {
      processQueue();
    }
  }
}

function resetSpeakingState() {
  if (currentMsgId) {
    const el = document.getElementById(currentMsgId);
    if (el) el.classList.remove('speaking');
    currentMsgId = null;
  }
  isSpeaking = false;
  hideSpeakingIndicator();
  const glow = document.getElementById('appGlow');
  if (glow) glow.classList.remove('active');
  updateQueueBadge();
}

export function stopCurrentTTS({ clearQueue = false } = {}) {
  if (ttsAbortController) {
    ttsAbortController.abort();
    ttsAbortController = null;
  }
  if (activeAudio) {
    // Quitar los handlers ANTES de src='': si no, el src vacio dispara
    // audio.onerror → finish(onError) → processQueue(), un pump fantasma
    // por cada skip.
    activeAudio.onended = null;
    activeAudio.onerror = null;
    activeAudio.pause();
    activeAudio.src = '';
    activeAudio = null;
  }
  if (clearQueue) speechQueue = [];
  resetSpeakingState();
}

export function skipCurrentTTS() {
  const hadPending = activeAudio || ttsAbortController || isSpeaking;
  stopCurrentTTS({ clearQueue: false });
  if (hadPending) window.electronAPI?.trackEvent('tts:skipped');
  showToast(hadPending ? t('toast.ttsSkipped') : t('toast.ttsNoActive'));
  if (!ttsPaused && ttsGlobalEnabled && speechQueue.length > 0) {
    if (skipPumpTimer) clearTimeout(skipPumpTimer);
    skipPumpTimer = setTimeout(() => { skipPumpTimer = null; processQueue(); }, 50);
  }
}

export function clearTTSQueue() {
  const cleared = speechQueue.length + (isSpeaking ? 1 : 0);
  stopCurrentTTS({ clearQueue: true });
  ttsDroppedCount = 0;
  ttsErrorCount = 0;
  updateQueueBadge();
  showToast(cleared ? t('toast.ttsQueueCleared') : t('toast.ttsQueueEmpty'));
}

export function enableEmergencyTTSMode() {
  Object.assign(appSettings, {
    readChat: false,
    readGifts: true,
    readJoins: false,
    readFollows: true,
    readLikes: false,
    readShares: false,
  });
  applySettings();
  saveSettings();
  clearTTSQueue();
  sendStateSync();
  showToast(t('toast.emergencyActive'));
}

export function playAudioBlob(blob, { onEnd, onError } = {}) {
  if (!blob || blob.size === 0) { onError?.(); return; }

  // Si quedo un audio previo referenciado (dos blobs resolvieron casi juntos),
  // matarlo antes de reemplazarlo — si no, sigue sonando fuera del alcance de
  // skip/pause (voces superpuestas).
  if (activeAudio) {
    activeAudio.onended = null;
    activeAudio.onerror = null;
    try { activeAudio.pause(); activeAudio.src = ''; } catch (_) { /* noop */ }
  }

  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.playbackRate = ttsRate;
  audio.volume = ttsVol;
  audio.preservesPitch = false;
  activeAudio = audio;

  let settled = false;
  const finish = (cb) => {
    if (settled) return;
    settled = true;
    // Solo soltar la referencia global si sigue siendo ESTE audio; un audio
    // huerfano que termina no debe pisar el activeAudio de otra ejecucion.
    if (activeAudio === audio) activeAudio = null;
    URL.revokeObjectURL(url);
    cb?.();
  };

  audio.onended = () => finish(onEnd);
  audio.onerror = () => {
    logStorage.addLog('error', 'client', 'Error de reproducción', { blobSize: blob.size });
    finish(onError);
  };

  let playTimer = null;
  Promise.race([
    audio.play(),
    new Promise((_, rej) => { playTimer = setTimeout(() => rej(new Error('timeout')), 5000); }),
  ]).finally(() => {
    if (playTimer) { clearTimeout(playTimer); playTimer = null; }
  }).catch((err) => {
    if (err.message === 'timeout') logStorage.addLog('error', 'client', 'Timeout en audio.play()');
    finish(onError);
  });
}

export function updateRate(v) {
  setTtsRate(parseFloat(v));
  document.getElementById('rateVal').textContent = ttsRate.toFixed(1);
  if (activeAudio) activeAudio.playbackRate = ttsRate;
  appSettings.rate = ttsRate;
  saveSettings();
}

export function updateVol(v) {
  setTtsVol(parseFloat(v));
  document.getElementById('volVal').textContent = Math.round(ttsVol * 100);
  if (activeAudio) activeAudio.volume = ttsVol;
  appSettings.vol = ttsVol;
  saveSettings();
}

export function speak(text, msgId, timestamp) {
  if (!ttsGlobalEnabled) return;
  if (speechQueue.length >= MAX_QUEUE_SIZE) {
    ttsDroppedCount++;
    window.electronAPI?.trackEvent('tts:queue-overflow');
    updateQueueBadge();
    return;
  }
  // Orden por timestamp, no por llegada al cliente: la moderacion agrega
  // latencia variable a los mensajes de chat, mientras que joins/gifts/
  // alertas no pasan por ese filtro y pueden llegar antes aunque hayan
  // ocurrido despues.
  speechQueue.push({ text, msgId, timestamp: timestamp || Date.now() });
  speechQueue.sort((a, b) => a.timestamp - b.timestamp);
  updateQueueBadge();
  if (!isSpeaking) processQueue();
}

export async function processQueue() {
  // Guard de reentrancia: colapsa los pumps redundantes (setTimeout de skip,
  // onEnd/onError de audio, speak()) en una sola ejecucion serializada.
  if (queuePumping) { queueDirty = true; return; }
  queuePumping = true;
  try {
    await _processQueueOnce();
  } finally {
    queuePumping = false;
    if (queueDirty) {
      queueDirty = false;
      if (!ttsPaused && ttsGlobalEnabled && speechQueue.length > 0) processQueue();
    }
  }
}

async function _processQueueOnce() {
  if (ttsPaused) return;
  if (speechQueue.length === 0) {
    isSpeaking = false;
    hideSpeakingIndicator();
    const glow = document.getElementById('appGlow');
    if (glow) glow.classList.remove('active');
    if (currentMsgId) {
      const el = document.getElementById(currentMsgId);
      if (el) el.classList.remove('speaking');
      currentMsgId = null;
    }
    return;
  }

  isSpeaking = true;
  const queueItem = speechQueue.shift();
  const { text, msgId } = queueItem;
  updateQueueBadge();

  if (currentMsgId) {
    const prev = document.getElementById(currentMsgId);
    if (prev) prev.classList.remove('speaking');
  }
  currentMsgId = msgId;
  const msgEl = document.getElementById(msgId);
  if (msgEl) msgEl.classList.add('speaking');
  chatFollowSpeaking();

  showSpeakingIndicator(text);
  const glow = document.getElementById('appGlow');
  if (glow) glow.classList.add('active');

  const voiceId = document.getElementById('voiceSelect')?.value || 'es';
  const voice = voiceId;

  ttsAbortController = new AbortController();
  const myController = ttsAbortController;
  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice }),
      signal: myController.signal,
    });

    if (!res.ok) { logStorage.addLog('error', 'network', `Error TTS HTTP ${res.status}`); throw new Error('TTS error'); }

    const blob = await res.blob();
    if (ttsPaused) {
      speechQueue.unshift(queueItem);
      updateQueueBadge();
      resetSpeakingState();
      return;
    }
    if (!ttsGlobalEnabled) {
      resetSpeakingState();
      return;
    }
    logStorage.addLog('info', 'network', 'Audio recibido', { size: blob.size });
    ttsErrorCount = 0;
    updateQueueBadge();
    playAudioBlob(blob, { onEnd: () => processQueue(), onError: () => processQueue() });
  } catch (err) {
    if (err.name === 'AbortError') {
      isSpeaking = false;
      hideSpeakingIndicator();
      const glow2 = document.getElementById('appGlow');
      if (glow2) glow2.classList.remove('active');
      return;
    }
    logStorage.addLog('error', 'network', `Error TTS: ${err.message}`);
    ttsErrorCount++;
    updateQueueBadge();
    if (ttsErrorCount >= TTS_MAX_ERRORS) {
      showToast(t('toast.ttsPausedErrors'));
      isSpeaking = false;
      hideSpeakingIndicator();
      const glow2 = document.getElementById('appGlow');
      if (glow2) glow2.classList.remove('active');
      return;
    }
    setTimeout(() => processQueue(), 300);
  } finally {
    // Solo anular si sigue siendo el nuestro — con el guard de reentrancia esto
    // ya casi no compite, pero lo mantiene correcto si algo re-entra.
    if (ttsAbortController === myController) ttsAbortController = null;
  }
}

function showSpeakingIndicator(text) {
  const el = document.getElementById('speakingNow');
  if (el) el.classList.add('visible');
  const txt = document.getElementById('speakingText');
  if (txt) txt.textContent = text.length > 60 ? text.substring(0, 60) + '…' : text;
}

function hideSpeakingIndicator() {
  const el = document.getElementById('speakingNow');
  if (el) el.classList.remove('visible');
}

/** Usado tambien por clearChat() (chat-ui.js), que limpia el log visible
 * y la cola TTS a la vez sin pasar por clearTTSQueue() (esa muestra un
 * toast de "cola vaciada" que no aplica al limpiar el chat). */
export function resetTtsCounters() {
  ttsDroppedCount = 0;
  ttsErrorCount = 0;
}

export function updateQueueBadge() {
  const el = document.getElementById('queueBadge');
  if (!el) return;
  const parts = [`Cola: ${speechQueue.length} mensaje${speechQueue.length !== 1 ? 's' : ''}`];
  if (ttsDroppedCount > 0) parts.push(`descartados: ${ttsDroppedCount}`);
  if (ttsErrorCount > 0) parts.push(`errores TTS: ${ttsErrorCount}/${TTS_MAX_ERRORS}`);
  el.textContent = parts.join(' · ');
}

export function sendStateSync() {
  const ws = getWs();
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  const clipsData = getClipsData();
  const today = getLocalDateStr();
  const todayClips = (clipsData[today] || []).map((e) => ({ id: e.id, elapsed: e.elapsed, absoluteTime: e.absoluteTime, label: e.label }));
  ws.send(JSON.stringify({
    type: 'state-sync',
    state: {
      ttsGlobalEnabled,
      ttsPaused,
      streamTimerRunning: !!obtenerStreamStartTime(),
      options: { ...options },
      clips: todayClips,
    },
  }));
}
