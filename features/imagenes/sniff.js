'use strict';

const FIRMA_PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

/** Tipo de imagen por los bytes (nunca por la extension ni el mime del cliente). null si no es PNG, JPEG, WebP o GIF. */
function tipoImagen(bytes) {
  if (bytes.length < 12) return null;
  if (bytes.subarray(0, 8).equals(FIRMA_PNG)) return { ext: 'png', mime: 'image/png' };
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { ext: 'jpg', mime: 'image/jpeg' };
  if (bytes.toString('ascii', 0, 3) === 'GIF') return { ext: 'gif', mime: 'image/gif' };
  if (bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return { ext: 'webp', mime: 'image/webp' };
  return null;
}

module.exports = { tipoImagen };
