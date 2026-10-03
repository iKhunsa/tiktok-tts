'use strict';

const SEVERITY = { allow: 0, mute: 1, drop: 2 };
const ACTION_BY_RUST_ACTION = { ALLOW: 'allow', REVIEW: 'mute', BLOCK: 'drop' };

function rustActionToVerdictAction(rustVerdict) {
  return ACTION_BY_RUST_ACTION[rustVerdict.action] || 'allow';
}

function wouldHarden(verdict, rustVerdict) {
  return SEVERITY[rustActionToVerdictAction(rustVerdict)] > SEVERITY[verdict.action];
}

// Solo endurece (allow->mute/drop, mute->drop); nunca relaja un veredicto.
function hardenVerdict(verdict, rustVerdict) {
  if (!wouldHarden(verdict, rustVerdict)) return verdict;
  return {
    ...verdict,
    action: rustActionToVerdictAction(rustVerdict),
    reasons: [...verdict.reasons, `rust:${rustVerdict.category || 'sin_categoria'}`],
  };
}

module.exports = { hardenVerdict, wouldHarden };
