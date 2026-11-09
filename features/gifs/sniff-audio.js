'use strict';

// Reconoce por los bytes (no por la extension ni el content-type, que mienten) si un archivo es un audio que
// Chromium sabe reproducir: MP3, WAV, OGG, FLAC o M4A. Puro, sin I/O. Devuelve la misma forma que sniff.js.
const ascii = (buf, desde, hasta) => buf.toString('latin1', desde, hasta);
const audio = (ext, mime) => ({ tipo: 'audio', ext, mime, animado: true });

function sniffAudio(buf) {
  if (buf.length < 12) return null;
  if (ascii(buf, 0, 3) === 'ID3' || (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0)) return audio('mp3', 'audio/mpeg');
  if (ascii(buf, 0, 4) === 'RIFF' && ascii(buf, 8, 12) === 'WAVE') return audio('wav', 'audio/wav');
  if (ascii(buf, 0, 4) === 'OggS') return audio('ogg', 'audio/ogg');
  if (ascii(buf, 0, 4) === 'fLaC') return audio('flac', 'audio/flac');
  if (ascii(buf, 4, 8) === 'ftyp' && ascii(buf, 8, 12) === 'M4A ') return audio('m4a', 'audio/mp4');
  return null;
}

module.exports = { sniffAudio };
