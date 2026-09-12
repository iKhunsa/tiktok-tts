'use strict';

const fs = require('fs');
const path = require('path');
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { RESOURCE_BASE } = require('../core/paths');
const { testGift } = require('../features/overlay/routes/test-gift');

test('la alerta de regalo de prueba siempre incluye la URL de un PNG local existente', () => {
  const messages = [];
  const handler = testGift({
    bus: { emit: (_event, payload) => messages.push(payload) },
    logger: { log: () => {} },
  });
  const res = {
    status: () => res,
    json: (body) => { res.body = body; },
  };

  handler({}, res);

  assert.equal(res.body.success, true);
  assert.equal(messages.length, 1);
  const payload = messages[0];
  assert.match(payload.giftPictureUrl, /^\/gifts\//);
  const filename = decodeURIComponent(payload.giftPictureUrl.slice('/gifts/'.length));
  assert.ok(fs.existsSync(path.join(RESOURCE_BASE, 'gifts', filename)));
});
