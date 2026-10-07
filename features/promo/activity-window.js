'use strict';

const WINDOW_MS = 5 * 60 * 1000;

// Ultima vez que escribio cada persona. Contar personas distintas (y no
// mensajes) evita que un solo usuario hablando mucho active la promo.
const lastSeen = new Map();

function podar(now) {
  const cutoff = now - WINDOW_MS;
  for (const [clave, ts] of lastSeen) if (ts < cutoff) lastSeen.delete(clave);
}

/** `clave` identifica a la persona entre plataformas (`plataforma:id`). */
function registrarMensaje(clave) {
  if (!clave) return;
  const now = Date.now();
  podar(now);
  lastSeen.set(clave, now);
}

function personasDistintas() {
  podar(Date.now());
  return lastSeen.size;
}

function reiniciar() {
  lastSeen.clear();
}

module.exports = { registrarMensaje, personasDistintas, reiniciar, WINDOW_MS };
