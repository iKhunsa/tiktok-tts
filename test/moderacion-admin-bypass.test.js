'use strict';

// Boot real del dominio moderacion (chat-guard + rust-guard + gift-gate) y
// verifica, plataforma por plataforma, que nada restringe a un admin.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

process.env.TIKTOK_USER_DATA_PATH = fs.mkdtempSync(path.join(os.tmpdir(), 'tiklive-admin-'));

const { createEventBus } = require('../core/event-bus');
const moderacionPolicy = require('../core/contracts/moderacion-policy');
const idioma = require('../features/idioma');
const moderacion = require('../features/moderacion');
const { DEFAULT_CONFIG } = require('../features/configuracion/default-config');

const ADMINS = DEFAULT_CONFIG.adminIdentities;
let seq = 0;
const RAW = {
  tiktok: (nick, text) => ({ comment: text, uniqueId: nick, nickname: nick, userId: `u-${nick}`, msgId: String(++seq) }),
  twitch: (nick, text) => ({ message: text, tags: { username: nick, 'display-name': nick, 'user-id': `u-${nick}`, id: String(++seq) } }),
  youtube: (nick, text) => ({ message: [{ text }], author: { name: `@${nick}`, channelId: `u-${nick}` }, id: String(++seq) }),
  kick: (nick, text) => ({ content: text, username: nick, userId: `u-${nick}`, id: String(++seq) }),
};

const config = {
  ...DEFAULT_CONFIG,
  ttsGiftGateTiktokEnabled: true, ttsGiftGateTwitchEnabled: true, ttsGiftGateKickEnabled: true,
};
const logger = { log() {} };
const bus = createEventBus(logger);
bus.on('config:get', (respond) => respond(config), 'test');
const app = new Proxy({}, { get: () => () => {} });
idioma.register({ app, bus, logger });
moderacion.register({ app, bus, logger });
test.after(() => moderacion.shutdown?.());

// Mensajes que el guard bloquea o silencia a cualquier no-admin.
// (caracteres repetidos, largo, flood repetido, idioma raro).
const CASOS = ['aaaaaaaaaaaa', 'x'.repeat(400), 'hola hola', 'hola hola', 'Привет как дела'];

for (const [platform, nicks] of Object.entries(ADMINS)) {
  for (const nick of nicks) {
    test(`admin ${platform}:${nick} nunca es restringido`, () => {
      for (const text of CASOS) {
        const v = moderacionPolicy.review({ platform, raw: RAW[platform](nick, text) });
        assert.equal(v.action, 'allow', `${platform}:${nick} "${text.slice(0, 20)}" -> ${v.action} ${v.reasons}`);
      }
    });
  }

  test(`no-admin en ${platform} si se modera (control)`, () => {
    const v = moderacionPolicy.review({ platform, raw: RAW[platform]('cualquiera123', 'aaaaaaaaaaaa') });
    assert.notEqual(v.action, 'allow');
  });
}
