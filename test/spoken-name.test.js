'use strict';

const test = require('node:test');
const assert = require('node:assert');
const { resolveSpokenName } = require('../core/display-name');

const CASES = [
  { nick: 'lu15', handle: undefined, expected: 'lu15' },
  { nick: 'ana_123', handle: undefined, expected: 'ana 123' },
  { nick: 'pablo2024', handle: undefined, expected: 'pablo2024' },
  { nick: 'pablito434435433453', handle: undefined, expected: 'pablito' },
  { nick: 'user14423423423424242234', handle: undefined, expected: '' },
  { nick: 'usuario14423423', handle: undefined, expected: '' },
  { nick: '🔥🔥🔥', handle: 'maria_luz', expected: 'maria luz' },
  { nick: '🔥🔥🔥', handle: undefined, expected: '' },
  { nick: '', handle: undefined, expected: '' },
  { nick: 'user14423423', handle: 'pedro99', expected: 'pedro99' },
];

for (const { nick, handle, expected } of CASES) {
  test(`resolveSpokenName(${JSON.stringify(nick)}, ${JSON.stringify(handle)}) -> ${JSON.stringify(expected)}`, () => {
    assert.strictEqual(resolveSpokenName(nick, handle), expected);
  });
}
