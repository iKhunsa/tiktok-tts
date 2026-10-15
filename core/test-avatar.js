'use strict';

// Avatar de prueba autocontenido (data URI): un circulo de color estable por
// nombre con su inicial. Permite ver el layout con foto sin depender del CDN de TikTok.
function testAvatar(user) {
  const hue = [...user].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="hsl(${hue} 65% 45%)"/><text x="32" y="43" font-size="30" font-family="sans-serif" font-weight="700" text-anchor="middle" fill="#fff">${user[0].toUpperCase()}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

module.exports = { testAvatar };
