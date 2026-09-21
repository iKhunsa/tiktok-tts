'use strict';

const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { buildEmbed, reportIdea, resetRateLimit, validateIdea } = require('../features/sugerencias/routes/report-idea');
const { postIdeasWebhook } = require('../features/sugerencias/discord/post-webhook');

const valid = { problema: '  problema  ', idea: 'idea', audiencia: 'muchos', casoUso: 'en vivo', motivo: 'ayuda', appSimilar: 'app' };
const logger = { log() {} };

function response() {
  return { code: 200, body: null, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
}

afterEach(resetRateLimit);

test('valida los campos obligatorios, audiencia fija y recorta texto', () => {
  assert.equal(validateIdea({ ...valid, audiencia: 'otro' }).errorKey, 'errors.ideasInvalidAudience');
  assert.equal(validateIdea({ ...valid, idea: ' ' }).errorKey, 'errors.ideasRequired');
  assert.equal(validateIdea({ ...valid, idea: 'x'.repeat(3000) }).value.idea.length, 2000);
});

test('arma un embed dentro de los límites de Discord', () => {
  const embed = buildEmbed({ ...valid, problema: 'x'.repeat(2000) }, { appVersion: '1.2.3', language: 'es' });
  assert.ok(embed.fields.every((field) => field.value.length <= 1024));
  assert.ok(embed.fields.some((field) => field.value.endsWith('...')));
  assert.ok(JSON.stringify(embed).length < 6000);
});

test('el webhook evita menciones y no hace red real', async () => {
  const oldFetch = global.fetch;
  let payload;
  global.fetch = async (_url, options) => { payload = JSON.parse(options.body); return { ok: true, status: 204 }; };
  try { await postIdeasWebhook('mock-url', buildEmbed(valid)); } finally { global.fetch = oldFetch; }
  assert.deepEqual(payload.allowed_mentions, { parse: [] });
});

test('controla URL ausente y rate limit sin llamar al webhook', async () => {
  let calls = 0;
  const missing = reportIdea(logger, null, { getWebhookUrl: () => null, postWebhook: async () => { calls++; } });
  const noUrl = response();
  await missing({ body: valid }, noUrl);
  assert.equal(noUrl.code, 503);
  assert.equal(noUrl.body.errorKey, 'errors.ideasUnavailable');
  assert.equal(calls, 0);

  let now = 10_000;
  const handler = reportIdea(logger, null, { now: () => now, getWebhookUrl: () => 'mock-url', postWebhook: async () => { calls++; } });
  const first = response();
  await handler({ body: valid }, first);
  const limited = response();
  await handler({ body: valid }, limited);
  assert.equal(first.code, 200);
  assert.equal(limited.code, 429);
  assert.equal(limited.body.errorKey, 'errors.ideasRateLimited');
});
