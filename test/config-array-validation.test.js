'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { DEFAULT_CONFIG } = require('../features/configuracion/default-config');
const { applyConfigPatch } = require('../features/configuracion/apply-patch');
const { playlistPut } = require('../features/sonido/musica/routes/playlist-put');

test('config rechaza arrays no textuales antes de que rompan el bot musical', () => {
  const config = { ...DEFAULT_CONFIG, musicBannedUsers: [], streamerPlaylist: [] };

  const result = applyConfigPatch(config, {
    musicBannedUsers: ['viewer', { invalid: true }],
    streamerPlaylist: ['song', 42],
  });

  assert.deepEqual(result.rejected.sort(), ['musicBannedUsers', 'streamerPlaylist']);
  assert.deepEqual(config.musicBannedUsers, []);
  assert.deepEqual(config.streamerPlaylist, []);
});

test('PUT playlist responde 400 para una linea no textual sin llamar al motor', async () => {
  let resolveCalled = false;
  const handler = playlistPut({
    musicState: { playlistResolved: [] },
    // La dependencia real no debe alcanzar resolveAndSavePlaylist con este input.
    engine: { expandPlaylist: () => { resolveCalled = true; } },
  });
  const res = {
    status: (code) => { res.statusCode = code; return res; },
    json: (body) => { res.body = body; },
  };

  await handler({ body: { lines: ['valid', { not: 'text' }] } }, res, (err) => { throw err; });

  assert.equal(res.statusCode, 400);
  assert.match(res.body.error, /array de texto/);
  assert.equal(resolveCalled, false);
});
