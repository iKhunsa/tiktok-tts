'use strict';

// Reconoce por los bytes (no por la extension ni el content-type, que mienten) si un archivo es una
// imagen o video animado que se puede usar: GIF, WebP animado, APNG, MP4 o WebM. Puro, sin I/O.

const ascii = (buf, desde, hasta) => buf.toString('latin1', desde, hasta);

// Recorre los bloques del GIF contando fotogramas; con uno solo es una imagen fija.
function sniffGif(buf) {
  if (buf.length < 13) return null;
  const ancho = buf.readUInt16LE(6);
  const alto = buf.readUInt16LE(8);
  let i = 13 + ((buf[10] & 0x80) ? 3 * (2 ** ((buf[10] & 7) + 1)) : 0);
  let fotogramas = 0;
  const saltarSubbloques = () => {
    while (i < buf.length && buf[i] !== 0) i += buf[i] + 1;
    i += 1;
  };
  while (i < buf.length) {
    const marca = buf[i];
    if (marca === 0x3b) break;
    if (marca === 0x21) { i += 2; saltarSubbloques(); } else if (marca === 0x2c) {
      fotogramas += 1;
      const empaquetado = buf[i + 9];
      i += 10 + ((empaquetado & 0x80) ? 3 * (2 ** ((empaquetado & 7) + 1)) : 0) + 1;
      saltarSubbloques();
    } else break;
    if (fotogramas > 1) break;
  }
  return { tipo: 'gif', ext: 'gif', mime: 'image/gif', animado: fotogramas > 1, ancho, alto };
}

function sniffWebp(buf) {
  if (buf.length < 30) return null;
  // Solo el formato extendido (VP8X) puede traer animacion: el bit 0x02 de sus banderas.
  const extendido = ascii(buf, 12, 16) === 'VP8X';
  const animado = extendido && (buf[20] & 0x02) !== 0;
  const ancho = extendido ? 1 + buf.readUIntLE(24, 3) : undefined;
  const alto = extendido ? 1 + buf.readUIntLE(27, 3) : undefined;
  return { tipo: 'webp', ext: 'webp', mime: 'image/webp', animado, ancho, alto };
}

// APNG es un PNG con un bloque acTL antes de los datos de imagen.
function sniffPng(buf) {
  if (buf.length < 33) return null;
  const ancho = buf.readUInt32BE(16);
  const alto = buf.readUInt32BE(20);
  let i = 8;
  let animado = false;
  while (i + 8 <= buf.length) {
    const tipo = ascii(buf, i + 4, i + 8);
    if (tipo === 'acTL') { animado = true; break; }
    if (tipo === 'IDAT' || tipo === 'IEND') break;
    i += 12 + buf.readUInt32BE(i);
  }
  return { tipo: 'apng', ext: 'png', mime: 'image/png', animado, ancho, alto };
}

function sniffGifLike(buf) {
  if (buf.length < 12) return null;
  const cabecera = ascii(buf, 0, 6);
  if (cabecera === 'GIF87a' || cabecera === 'GIF89a') return sniffGif(buf);
  if (ascii(buf, 0, 4) === 'RIFF' && ascii(buf, 8, 12) === 'WEBP') return sniffWebp(buf);
  if (buf[0] === 0x89 && ascii(buf, 1, 4) === 'PNG') return sniffPng(buf);
  // Un video en bucle (lo que sirven GIPHY o Tenor como "gif"): se acepta, no se puede comprobar el bucle.
  if (ascii(buf, 4, 8) === 'ftyp') return { tipo: 'video', ext: 'mp4', mime: 'video/mp4', animado: true };
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) return { tipo: 'video', ext: 'webm', mime: 'video/webm', animado: true };
  return null;
}

module.exports = { sniff: sniffGifLike };
