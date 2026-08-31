'use strict';

// Utilidad minima de formato de nombre para alertas de overlay — no es la
// resolucion de identidad completa de /chat (Fase 7), solo evita mostrar
// basura sin procesar en pantalla.
function cleanNick(nickname, fallback) {
  const raw = String(nickname || fallback || 'Alguien').trim();
  return raw || 'Alguien';
}

module.exports = { cleanNick };
