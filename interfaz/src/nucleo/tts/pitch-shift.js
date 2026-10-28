/**
 * Cambia el tono de un audio SIN afectar su duracion, usando solo APIs
 * nativas del navegador (nada de librerias ni servicios externos):
 *
 * 1. El blob se decodifica a un AudioBuffer (Web Audio API) y se renderiza
 *    OFFLINE a una velocidad distinta (`pitchRatio`) — ese cambio de
 *    velocidad es lo que de verdad mueve el tono (efecto fisico de
 *    resampleo, como un vinilo mas rapido/lento), pero de paso tambien
 *    cambia la duracion.
 * 2. El resultado se codifica a un WAV finito (Blob normal) en vez de
 *    quedar como un MediaStream en vivo: un <audio> con `srcObject` de un
 *    MediaStream nunca dispara `ended` de forma confiable (el stream sigue
 *    "vivo" aunque la fuente ya termino de producir audio), lo que colgaba
 *    la cola de TTS para siempre con tono no-neutro. Un blob finito como
 *    `audio.src` se comporta igual que la ruta sin tono (ver cola-tts.js),
 *    `ended` dispara normal.
 * 3. cola-tts.js usa ese blob como un <audio> cualquiera, con `playbackRate`
 *    + `preservesPitch = true` (nativo de Chromium) para devolverle la
 *    duracion original SIN perder el tono nuevo — es la misma propiedad que
 *    ya usamos para que "Velocidad" no manche el tono, acá se usa al reves.
 *
 * Si el pitch no cambio en la nota ya empezada, no se reconstruye en
 * caliente: solo aplica al proximo mensaje que arranque (ver updatePitch
 * en cola-tts.js) — mantiene esto simple.
 */

let sharedContext = null;

function getAudioContext() {
  if (!sharedContext || sharedContext.state === 'closed') sharedContext = new AudioContext();
  return sharedContext;
}

// Encoder PCM 16-bit WAV standalone (sin libreria): header de 44 bytes +
// samples intercalados por canal, clamped a [-1, 1].
function audioBufferToWav(buffer) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const numFrames = buffer.length;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = numFrames * blockAlign;

  const out = new ArrayBuffer(44 + dataSize);
  const view = new DataView(out);

  const writeString = (offset, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // tamaño del sub-chunk fmt
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true); // byte rate
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true); // bits por muestra
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  const channels = [];
  for (let c = 0; c < numChannels; c++) channels.push(buffer.getChannelData(c));

  let pos = 44;
  for (let i = 0; i < numFrames; i++) {
    for (let c = 0; c < numChannels; c++) {
      const sample = Math.max(-1, Math.min(1, channels[c][i]));
      view.setInt16(pos, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
      pos += bytesPerSample;
    }
  }

  return new Blob([out], { type: 'audio/wav' });
}

/**
 * Devuelve un Blob WAV finito con el tono ya desplazado por `pitchRatio`
 * (resampleo offline, no en tiempo real). Puede rechazar (decode fallido,
 * AudioContext no disponible) — quien llama tiene que caer a la
 * reproduccion normal sin pitch-shift.
 */
export async function crearBlobPitchShift(blob, pitchRatio) {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') await ctx.resume();

  const arrayBuffer = await blob.arrayBuffer();
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

  // playbackRate > 1 recorre el buffer mas rapido -> dura menos; por eso el
  // contexto offline necesita exactamente length/pitchRatio frames para
  // capturar la fuente entera sin cortarla ni dejar cola de silencio.
  const framesRenderizados = Math.ceil(audioBuffer.length / pitchRatio);
  const offlineCtx = new OfflineAudioContext(
    audioBuffer.numberOfChannels,
    framesRenderizados,
    audioBuffer.sampleRate
  );
  const source = offlineCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.playbackRate.value = pitchRatio;
  source.connect(offlineCtx.destination);
  source.start();

  const renderizado = await offlineCtx.startRendering();
  return audioBufferToWav(renderizado);
}
