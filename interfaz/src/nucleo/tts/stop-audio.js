// Quitar los handlers ANTES de src='': si no, el src vacio dispara
// audio.onerror → finish(onError) → processQueue(), un pump fantasma.
export function stopAudio(audio) {
  audio.onended = null;
  audio.onerror = null;
  try { audio.pause(); audio.src = ''; } catch { /* noop */ }
}
