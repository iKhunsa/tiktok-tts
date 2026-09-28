'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const idiomaFiltrar = require('../core/contracts/idioma-filtrar');
const { buildGuardOptions } = require('../features/moderacion/build-guard-options');

test('languageCheck usa la configuracion actual sin recrear el guard', () => {
  let config = { ttsVoiceLang: 'es', langFilterEnabled: false };
  const bus = { emit: (_event, respond) => respond(config) };
  const calls = [];
  const originalFilter = idiomaFiltrar.filtrar;
  idiomaFiltrar.filtrar = (_text, voice, options) => {
    calls.push({ voice, options });
    return false;
  };

  try {
    const { languageCheck } = buildGuardOptions({ bus, blockedWords: new Set() });
    languageCheck('hola');
    config = { ttsVoiceLang: 'en', langFilterEnabled: true, dictFilterEnabled: true, allowedExtraLangs: ['es'] };
    languageCheck('hello');

    assert.deepEqual(calls, [
      { voice: 'es', options: { langFilterEnabled: false, dictFilterEnabled: false, allowedExtraLangs: [] } },
      { voice: 'en', options: { langFilterEnabled: true, dictFilterEnabled: true, allowedExtraLangs: ['es'] } },
    ]);
  } finally {
    idiomaFiltrar.filtrar = originalFilter;
  }
});
