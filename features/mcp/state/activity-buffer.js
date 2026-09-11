'use strict';

// Ring buffer de los eventos log:entry del bus. Alimenta la tool get_activity —
// un "qué está pasando" para el agente sin tener que suscribirse al WS.

function createActivityBuffer({ cap = 300 } = {}) {
  const buf = [];

  function push(entry) {
    if (!entry || !entry.event) return;
    // Se guarda una versión recortada: sin stack, data acotada.
    buf.push({
      ts: entry.ts,
      level: entry.level,
      domain: entry.domain,
      event: entry.event,
      message: entry.message,
    });
    if (buf.length > cap) buf.shift();
  }

  function query({ limit = 50, level } = {}) {
    let out = buf;
    if (level) {
      const orden = { debug: 0, info: 1, warn: 2, error: 3, fatal: 4 };
      const min = orden[level] ?? 0;
      out = out.filter((e) => (orden[e.level] ?? 0) >= min);
    }
    const n = Math.max(1, Math.min(Number(limit) || 50, cap));
    return out.slice(-n);
  }

  return { push, query, size: () => buf.length };
}

module.exports = { createActivityBuffer };
