'use strict';

const { hardenVerdict, wouldHarden } = require('./map-rust-result');

const OUTCOME_BY_RUST_ACTION = { BLOCK: 'bloqueado', REVIEW: 'revision' };

// Segunda capa de moderacion: recibe el veredicto del guard JS y devuelve el
// mismo o uno mas duro. `shadow` solo registra la discrepancia.
function createRustReviewer({ rustGuard, logger }) {
  return function reviewWithRust(verdict) {
    if (!shouldConsultRust(rustGuard, verdict)) return verdict;
    const rustVerdict = rustGuard.check(verdict.message.text.display);
    if (!rustVerdict || !wouldHarden(verdict, rustVerdict)) return verdict;
    const enforcing = rustGuard.mode() === 'enforce';
    logDiscrepancy(logger, enforcing, verdict, rustVerdict);
    if (enforcing) return hardenVerdict(verdict, rustVerdict);
    return { ...verdict, shadow: { category: rustVerdict.category || null } };
  };
}

function shouldConsultRust(rustGuard, verdict) {
  return rustGuard.isRunning() && verdict.action !== 'drop' && Boolean(verdict.message);
}

// Sin texto del mensaje ni nick (privacidad).
function logDiscrepancy(logger, enforcing, verdict, rustVerdict) {
  const outcome = OUTCOME_BY_RUST_ACTION[rustVerdict.action];
  const event = enforcing ? `moderacion.rust.${outcome}` : 'moderacion.rust.shadow_bloqueado';
  logger.log('info', 'moderacion', 'rust-guard/review-with-rust.js#logDiscrepancy', event,
    enforcing ? 'Rust Chat Guard endurecio el veredicto' : 'Rust Chat Guard habria endurecido el veredicto (shadow)',
    { rustAction: rustVerdict.action, jsAction: verdict.action, category: rustVerdict.category, matchType: rustVerdict.matchType });
}

module.exports = { createRustReviewer };
