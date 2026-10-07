'use strict';

const { cleanName } = require('./clean-name');
const { isUnreadable } = require('./is-unreadable');

const LONG_TRAILING_DIGITS = /\s*\d{6,}$/;
const PLACEHOLDER_NAME = /^(user|usuario)\d*$/i;
const ONLY_DIGITS = /^\d+$/;

/** Nombre para la VOZ (no para mostrar): sin colas largas de digitos
 * ("pablito434435433453" -> "pablito"). '' = no hay nombre pronunciable,
 * el cliente dice "usuario". */
function resolveSpokenName(nickname, handle) {
  return speakableName(nickname) || speakableName(handle);
}

function speakableName(raw) {
  const name = cleanName(raw).replace(LONG_TRAILING_DIGITS, '').trim();
  return isPronounceable(name) ? name : '';
}

function isPronounceable(name) {
  return Boolean(name) && !isUnreadable(name) && !ONLY_DIGITS.test(name) && !PLACEHOLDER_NAME.test(name);
}

module.exports = { resolveSpokenName };
