'use strict';

// Diseñado para crecer: agregar un comando nuevo es agregar una rama aca,
// nunca tocar /sonido. Hoy solo existe !p (musica).
function parseCommand(text) {
  const trimmed = String(text || '').trim();
  const match = /^!p\s+(\S.*)$/i.exec(trimmed);
  if (!match) return null;
  return { comando: 'play', args: match[1].trim() };
}

module.exports = { parseCommand };
