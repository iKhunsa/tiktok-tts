'use strict';

const CONTINUATION = '[\u0080-\u00BF\u20AC\u201A\u0192\u201E\u2026\u2020\u2021\u02C6\u2030\u0160\u2039\u0152\u017D\u2018\u2019\u201C\u201D\u2022\u2013\u2014\u02DC\u2122\u0161\u203A\u0153\u017E\u0178]';
const MOJIBAKE_PATTERN = new RegExp(
  `(?:[\u00C2-\u00DF]${CONTINUATION}|[\u00E0-\u00EF]${CONTINUATION}{2}|[\u00F0-\u00F4]${CONTINUATION}{3})`,
  'gu',
);

function findMojibake(text) {
  return [...text.matchAll(MOJIBAKE_PATTERN)].map(({ 0: sample, index }) => ({ sample, index }));
}

module.exports = { findMojibake };
