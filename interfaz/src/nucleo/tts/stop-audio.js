export function stopAudio(audio) {
  audio.onended = null;
  audio.onerror = null;
  try { audio.pause(); audio.src = ''; } catch { /* noop */ }
}
