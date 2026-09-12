'use strict';

// Electron-only probe. Isolated userData and port; no production credentials.
// electron scripts/audit-tiktok-pipeline.js <username> [direct|server|fixtures] [seconds]
const { app, BrowserWindow } = require('electron');
process.on('uncaughtException', (err) => {
  if (process.env.ASTRA_REPORT_PATH) require('node:fs').appendFileSync(process.env.ASTRA_REPORT_PATH, JSON.stringify({ stage: 'uncaught', error: err.message }) + '\n');
  app.exit(1);
});
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const username = process.argv[2];
const mode = process.argv[3] || 'direct';
const durationMs = Number(process.argv[4] || 30) * 1000;
if (!username) throw new Error('Se requiere usuario TikTok');
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'astra-tiktok-'));
app.setPath('userData', profile);
process.env.TIKTOK_USER_DATA_PATH = profile;
process.env.PORT = '0';
process.env.CONFIG_DEFAULTS_FILE = '';
process.env.CUENTAS_URL = '';
app.on('window-all-closed', () => {});
const counts = {};
const record = (stage, data = {}) => {
  const line = JSON.stringify({ stage, ...data });
  console.log(line);
  if (process.env.ASTRA_REPORT_PATH) fs.appendFileSync(process.env.ASTRA_REPORT_PATH, `${line}\n`);
};
const count = (stage) => { counts[stage] = (counts[stage] || 0) + 1; };
let client;
let serverModule;
let renderer;
const deadline = setTimeout(() => finish('hard-timeout', 2), durationMs + 45000);

// Read only CDP diagnostics: never print cookies, signatures or chat contents.
app.on('web-contents-created', (_event, contents) => {
  const pending = new Map();
  contents.debugger.on('message', (_ev, method, params) => {
    if (method === 'Network.responseReceived' && /webcast\/room\/enter\//.test(params.response.url)) {
      const url = new URL(params.response.url);
      record('room-http', { status: params.response.status, bogusLength: (url.searchParams.get('X-Bogus') || '').length, tokenPresent: !!url.searchParams.get('msToken') });
      pending.set(params.requestId, true);
    }
    if (method === 'Network.loadingFinished' && pending.delete(params.requestId)) {
      contents.debugger.sendCommand('Network.getResponseBody', { requestId: params.requestId }).then((res) => {
        const body = res.base64Encoded ? Buffer.from(res.body, 'base64').toString() : res.body;
        let parsed;
        try { parsed = JSON.parse(body); } catch (_) { /* report format only */ }
        record('room-body', { bytes: Buffer.byteLength(body), base64: res.base64Encoded, keys: parsed && Object.keys(parsed), statusCode: parsed?.status_code, roomStatus: parsed?.data?.status });
      }).catch((err) => record('room-body-error', { error: err.message }));
    }
    if (method === 'Network.webSocketCreated') {
      record('ws-created', { host: new URL(params.url).host, path: new URL(params.url).pathname });
    }
    if (method === 'Network.webSocketFrameReceived') count('ws-frame');
    if (method === 'Network.webSocketClosed') record('ws-closed');
    if (method === 'Network.webSocketFrameError') record('ws-error', { error: params.errorMessage });
  });
});

let finished = false;
async function finish(result, exitCode = 0) {
  if (finished) return;
  finished = true;
  clearTimeout(deadline);
  if (renderer && !renderer.isDestroyed()) {
    const audio = await renderer.webContents.executeJavaScript('window.__astraAudio || null').catch(() => null);
    if (audio) record('renderer-audio', audio);
  }
  record('summary', { result, mode, counts });
  client?.disconnect();
  renderer?.destroy();
  if (serverModule) await require('../core/shutdown').shutdownAll(serverModule.logger);
  app.exit(exitCode);
}

async function main() {
  await app.whenReady();
  record('runtime', { electron: process.versions.electron, mode });
  let fixtureWindow;
  const clientModule = process.env.ASTRA_CLIENT_MODULE || '@tiklivetts/tiktok-live-client';
  const packageSrc = path.dirname(require.resolve(clientModule));
  if (mode === 'fixtures') {
    const { LiveWindow } = require(path.join(packageSrc, 'signing/live-window'));
    LiveWindow.prototype.connect = async function() { fixtureWindow = this; return { roomInfo: { status: 2 } }; };
  }
  if (mode === 'server' || mode === 'fixtures') {
    serverModule = require('../server');
    const { bus, server } = serverModule;
    for (const event of ['canal:mensaje-crudo', 'canal:gift', 'canal:like', 'canal:follow', 'canal:evento-especial', 'chat:mensaje-permitido', 'chat:mensaje-bloqueado', 'sonido:hablar']) {
      bus.on(event, () => count(event), 'audit');
    }
    bus.on('ws:broadcast', (data) => count(`broadcast:${data.type}`), 'audit');
    bus.on('log:entry', (entry) => {
      if (/sonido\.tts\./.test(entry.event)) count(entry.event);
    }, 'audit');
    if (!server.listening) await new Promise((resolve) => server.once('listening', resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    renderer = new BrowserWindow({ show: false, webPreferences: { backgroundThrottling: false } });
    renderer.webContents.setAudioMuted(true);
    await renderer.loadURL('about:blank');
    await renderer.webContents.debugger.attach();
    await renderer.webContents.debugger.sendCommand('Network.enable');
    renderer.webContents.debugger.on('message', (_ev, method, params) => {
      if (method === 'Network.responseReceived' && params.response.url.endsWith('/api/tts')) {
        record('renderer-tts-response', { status: params.response.status });
        count(`renderer-tts:${params.response.status}`);
      }
    });
    await renderer.loadURL(base);
    if (mode === 'fixtures') {
      await renderer.webContents.executeJavaScript(`localStorage.setItem('tikliveTTS_v1', JSON.stringify({readChat:true,readGifts:true,readFollows:true,readLikes:true,readShares:true,readJoins:true,sayUsername:false}))`);
      await renderer.loadURL(base);
    }
    // Test uses normal UI pipeline; only listen for completed audio playback.
    await renderer.webContents.executeJavaScript(`(() => {
      window.__astraAudio = {attempts:0,playing:0,ended:0,errors:[]};
      const play = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function(...args) {
        window.__astraAudio.attempts++;
        this.addEventListener('ended', () => window.__astraAudio.ended++, {once:true});
        const result = play.apply(this,args);
        result.then(() => window.__astraAudio.playing++, err => window.__astraAudio.errors.push(err.name));
        return result;
      };
    })()`, true);
    const response = await fetch(`${base}/api/platforms/connect`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ platform: 'tiktok', channel: username }) });
    record('connect-http', { status: response.status, result: await response.json() });
    if (mode === 'fixtures') {
      const { decodeWsFrame } = require(path.join(packageSrc, 'decode/decode-ws-frame'));
      const files = ['ws-frame-chat-nonfan.bin', 'ws-frame-like-member.bin', 'ws-frame-gift-rose.bin', 'ws-frame-social-follow.bin', 'ws-frame-social-share.bin'];
      for (const file of files) {
        const messages = decodeWsFrame(fs.readFileSync(path.join(packageSrc, '../test/fixtures', file)));
        for (const message of messages) fixtureWindow.emit('message', message);
      }
      record('fixtures-replayed', { files: files.length });
    }
  } else {
    const { TikTokLiveClient } = require(clientModule);
    client = new TikTokLiveClient(username);
    for (const event of ['chat', 'gift', 'like', 'member', 'follow', 'share', 'roomUserSeq']) client.on(event, () => count(`client:${event}`));
    client.on('error', (err) => record('client-error', { code: err.code, error: err.message }));
    client.on('disconnected', () => record('client-disconnected'));
    const result = await client.connect();
    record('connected', { roomStatus: result.roomInfo?.status });
  }
  setTimeout(() => finish('observed'), durationMs);
}

main().catch((err) => { record('failure', { code: err.code, error: err.message }); finish('failed', 1); });
