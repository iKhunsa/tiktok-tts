'use strict';

// get_recent_chat — últimos N mensajes de chat de todas las plataformas.
// Lee el ring buffer de features/chat por el contrato síncrono del bus
// (chat:recientes), sin HTTP.

function getRecentChat({ bus }, args) {
  const limit = Math.max(1, Math.min(Number(args && args.limit) || 50, 200));
  let mensajes = [];
  try { bus.emit('chat:recientes', (arr) => { mensajes = Array.isArray(arr) ? arr : []; }); } catch (_) { /* noop */ }
  return { messages: mensajes.slice(-limit), total: mensajes.length };
}

module.exports = getRecentChat;
