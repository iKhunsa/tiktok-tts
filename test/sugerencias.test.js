'use strict';

const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { buildEmbed, buildThreadName, reportIdea, resetRateLimit, validateIdea } = require('../features/sugerencias/routes/report-idea');
const { postIdeasWebhook } = require('../features/sugerencias/discord/post-webhook');
const express = require('express');
const { reportOverlayIdea, validateOverlayIdea } = require('../features/sugerencias/routes/report-overlay-idea');

const valid = { problema: '  problema  ', idea: 'idea', appSimilar: 'app', discord: 'nick', email: 'a@b.co' };
const logger = { log() {} };

function response() {
  return { code: 200, body: null, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
}

afterEach(resetRateLimit);

test('valida los campos obligatorios y recorta texto', () => {
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

test('un foro de Discord recibe thread_name; un canal normal reintenta sin hilo', async () => {
  const oldFetch = global.fetch;
  const payloads = [];
  const reply = (status, body) => ({ ok: status < 300, status, json: async () => body });
  try {
    global.fetch = async (_url, options) => { payloads.push(JSON.parse(options.body)); return reply(204); };
    await postIdeasWebhook('mock-url', buildEmbed(valid), { threadName: buildThreadName(valid) });
    assert.equal(payloads[0].thread_name, 'Idea: idea');

    payloads.length = 0;
    global.fetch = async (_url, options) => {
      payloads.push(JSON.parse(options.body));
      return payloads.length === 1 ? reply(400, { code: 220003 }) : reply(204);
    };
    await postIdeasWebhook('mock-url', buildEmbed(valid), { threadName: 'Idea: x' });
    assert.equal(payloads.length, 2);
    assert.equal(payloads[1].thread_name, undefined);

    global.fetch = async () => reply(400, { code: 50035 });
    await assert.rejects(postIdeasWebhook('mock-url', buildEmbed(valid), { threadName: 'Idea: x' }), /HTTP 400/);
  } finally { global.fetch = oldFetch; }
});

test('el título del hilo cabe en 100 caracteres y en una línea', () => {
  const name = buildThreadName({ idea: `a\n\n${'b'.repeat(500)}` });
  assert.ok(name.length <= 100);
  assert.ok(!name.includes('\n'));
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

test('idea de overlay: exige idea y un contacto', () => {
  assert.equal(validateOverlayIdea({ idea: 'x' }).errorKey, 'errors.overlayIdeaRequired');
  assert.equal(validateOverlayIdea({ discord: 'nick' }).errorKey, 'errors.overlayIdeaRequired');
  assert.equal(validateOverlayIdea({ idea: 'x', email: 'a@b.co' }).value.email, 'a@b.co');
});

async function postOverlay(form, deps) {
  const app = express();
  app.post('/o', reportOverlayIdea(logger, null, { getWebhookUrl: () => 'mock-url', ...deps }));
  const server = await new Promise((resolve) => { const s = app.listen(0, () => resolve(s)); });
  try {
    return await fetch(`http://127.0.0.1:${server.address().port}/o`, { method: 'POST', body: form });
  } finally { server.close(); }
}

test('idea de overlay: adjunta la imagen con nombre fijo y la muestra en el embed', async () => {
  let sent;
  const form = new FormData();
  form.append('idea', 'barra de metas');
  form.append('discord', 'nick');
  form.append('imagen', new Blob([Buffer.from('png')], { type: 'image/png' }), 'C:/Users/fran/foto.png');
  const res = await postOverlay(form, { postWebhook: async (_url, embed, options) => { sent = { embed, options }; } });
  assert.equal(res.status, 200);
  assert.equal(sent.options.file.name, 'referencia.png');
  assert.equal(sent.embed.image.url, 'attachment://referencia.png');
});

test('idea de overlay: rechaza archivos que no son imagen', async () => {
  const form = new FormData();
  form.append('idea', 'x');
  form.append('discord', 'nick');
  form.append('imagen', new Blob(['MZ'], { type: 'application/x-msdownload' }), 'a.exe');
  const res = await postOverlay(form, { postWebhook: async () => assert.fail('no debe enviarse') });
  assert.equal(res.status, 400);
  assert.equal((await res.json()).errorKey, 'errors.overlayIdeaImage');
});

test('postIdeasWebhook con archivo envia multipart con payload_json', async () => {
  const oldFetch = global.fetch;
  let body;
  global.fetch = async (_url, init) => { body = init.body; return { ok: true, status: 200 }; };
  try {
    await postIdeasWebhook('mock-url', { title: 't' }, { file: { name: 'referencia.png', type: 'image/png', buffer: Buffer.from('png') } });
  } finally { global.fetch = oldFetch; }
  assert.ok(body instanceof FormData);
  assert.equal(JSON.parse(body.get('payload_json')).embeds[0].title, 't');
  assert.equal(body.get('files[0]').name, 'referencia.png');
});
