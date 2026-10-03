'use strict';

// Motivos del guard que NO son contenido moderado: politica de seguidores
// (config del streamer) o fallo interno. No cuentan como "bloqueado".
const NOT_MODERATION = new Set(['non-follower', 'policy-evaluation-failed']);

const ORIGIN_BY_REASON = {
  banned: 'usuario',
  muted: 'usuario',
  'blocked-word': 'lista-propia',
  language: 'diccionario',
};

function originOf(reason) {
  if (reason.startsWith('rust:')) return 'motor-rust';
  return ORIGIN_BY_REASON[reason] || 'guard-js';
}

// Devuelve { origen, motivo } del veredicto, o null si no hubo moderacion de
// contenido. motivo: razon cruda del guard; para el motor Rust, su categoria.
function describeModeration(reasons = []) {
  const reason = reasons.find((r) => !NOT_MODERATION.has(r));
  if (!reason) return null;
  const origen = originOf(reason);
  return { origen, motivo: origen === 'motor-rust' ? reason.slice('rust:'.length) : reason };
}

module.exports = { describeModeration };
