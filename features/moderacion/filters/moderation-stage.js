'use strict';

const { foldAccents, getBlockedMatchers } = require('./blocked-matchers');
const { collapseRepeats } = require('./normalize-aggressive');
const idiomaFiltrarContract = require('../../../core/contracts/idioma-filtrar');

/**
 * Etapas de moderacion sin estado de identidad (todo menos el chequeo de
 * duplicados). Compartida entre isSpam y POST /api/moderation/preview.
 * El filtro de idioma (script/dict) se delega al contrato de /idioma
 * (Fase 3) en vez de reimplementarlo — nunca require('../../idioma/...') directo.
 */
function moderationStage(text, blockedMatchersState, idiomaOpts) {
  if (text.length > 300) return { stage: 'length' };
  if (/^(.)\1+$/.test(text.trim())) return { stage: 'repeatedChar' };

  const folded = foldAccents(text.toLowerCase());
  const { re1, re2 } = getBlockedMatchers(blockedMatchersState);
  if (re1 && re1.test(folded)) return { stage: 'blockedWord' };
  if (re2 && re2.test(collapseRepeats(folded))) return { stage: 'blockedWord' };

  const idiomaResult = idiomaFiltrarContract.filtrar(text, idiomaOpts.voiceId, idiomaOpts);
  if (!idiomaResult.ok) {
    return { stage: idiomaResult.stage, positive: idiomaResult.positive, negative: idiomaResult.negative };
  }

  return null;
}

module.exports = { moderationStage };
