'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { DEFAULT_CONFIG } = require('../features/configuracion/default-config');
const { applyConfigPatch } = require('../features/configuracion/apply-patch');
const { normalizeStoredConfig } = require('../features/configuracion/store');

test('TTS limita los valores nuevos y acota configuraciones guardadas antiguas', () => {
  const config = { ...DEFAULT_CONFIG };
  const result = applyConfigPatch(config, { TTS_MAX_CHARS: 201 });

  assert.deepEqual(result.rejected, ['TTS_MAX_CHARS']);
  assert.equal(config.TTS_MAX_CHARS, 200);
  assert.equal(normalizeStoredConfig({ TTS_MAX_CHARS: 500 }).TTS_MAX_CHARS, 200);
});
