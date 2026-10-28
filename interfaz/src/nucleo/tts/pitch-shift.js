/**
 * Cambia el tono de un audio SIN afectar su duracion, usando solo APIs
 * nativas del navegador (nada de librerias ni servicios externos):
 *
 * 1. El blob se decodifica a un AudioBuffer (Web Audio API) y se reproduce
 *    en tiempo real a una velocidad distinta (`pitchRatio`) hacia un
 *    MediaStream — ese cambio de velocidad es lo que de verdad mueve el
 *    tono (efecto fisico de resampleo, como un vinilo mas rapido/lento),
 *    pero de paso tambien cambia la duracion.
 * 2. Ese MediaStream se usa como fuente de un <audio> normal (lo arma
 *    cola-tts.js), al que se le pone `playbackRate` + `preservesPitch =
 *    true` (nativo de Chromium) para devolverle la duracion original SIN
 *    perder el tono nuevo — es la misma propiedad que ya usamos para que
 *    "Velocidad" no manche el tono, acá se usa al reves.
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

/**
 * Devuelve { stream, start, stop } — `stream` va directo a `audio.srcObject`;
 * `start()` hay que llamarlo antes de `audio.play()`; `stop()` corta la
 * fuente (llamarlo siempre al terminar/cancelar, si no el nodo sigue vivo
 * de fondo). Puede rechazar (decode fallido, AudioContext no disponible) —
 * quien llama tiene que caer a la reproduccion normal sin pitch-shift.
 */
export async function crearFuentePitchShift(blob, pitchRatio) {
  const ctx = getAudioContext();
  if (ctx.state === 'suspended') await ctx.resume();

  const arrayBuffer = await blob.arrayBuffer();
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

  const source = ctx.createBufferSource();
  source.buffer = audioBuffer;
  source.playbackRate.value = pitchRatio;

  const destino = ctx.createMediaStreamDestination();
  source.connect(destino);

  let terminado = false;
  source.onended = () => { terminado = true; };

  return {
    stream: destino.stream,
    start: () => source.start(),
    stop: () => {
      if (terminado) return;
      terminado = true;
      try { source.stop(); } catch (_) { /* ya termino o no habia arrancado */ }
    },
  };
}
