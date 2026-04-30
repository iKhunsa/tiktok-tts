const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { WebcastPushConnection } = require('tiktok-live-connector');
const path = require('path');
const gTTS = require('google-tts-api');
const https = require('https');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

let tiktokConnection = null;
let currentUsername = null;
let reconnectAttempts = 0;
let reconnectTimer = null;
let isConnecting = false;
const MAX_RECONNECT_ATTEMPTS = 5;

const clients = new Set();
const likePendingTimers = new Map();
const config = {
  LIKE_DEBOUNCE_MS: 1500,
  TTS_MAX_CHARS: 500,
  rateLimitEnabled: false,
  TTS_RATE_LIMIT_MAX: 10,
  TTS_RATE_WINDOW_MS: 5000,
  MAX_QUEUE_MSG: 15,
};

function log(level, ctx, msg, data = null) {
  const fn = level === 'error' ? console.error : console.log;
  fn(JSON.stringify({ ts: new Date().toISOString(), level, ctx, msg, ...(data && { data }) }));
}

function sanitizeForTTS(text) {
  return text
    .replace(/https?:\/\/\S+/g, 'link')
    .replace(/@\w+/g, '')
    .replace(/(.)\1{4,}/g, '$1$1$1')
    .replace(/[^\p{L}\p{N}\p{Z}\p{P}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const BLOCKED_WORDS_FILE = path.join(__dirname, 'blocked-words.md');
const blockedWords = new Set();

function loadBlockedWordsFromFile() {
  try {
    if (!fs.existsSync(BLOCKED_WORDS_FILE)) return;
    const content = fs.readFileSync(BLOCKED_WORDS_FILE, 'utf-8');
    const lines = content.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const word = trimmed.slice(2).toLowerCase().trim();
        if (word) blockedWords.add(word);
      }
    }
    log('info', 'blocked-words', 'loaded from file', { count: blockedWords.size });
  } catch (err) {
    log('error', 'blocked-words', 'failed to load file', { error: err.message });
  }
}

function saveBlockedWordsToFile() {
  try {
    const sorted = [...blockedWords].sort((a, b) => a.localeCompare(b));
    const lines = [
      '# Palabras Prohibidas — TikTok Live TTS',
      '',
      'Edita este archivo directamente o usa la web en `/advanced.html`.',
      'Las palabras se comparan en minúsculas, sin importar acentos.',
      ''
    ];
    for (const word of sorted) {
      lines.push(`- ${word}`);
    }
    lines.push('');
    fs.writeFileSync(BLOCKED_WORDS_FILE, lines.join('\n'), 'utf-8');
    log('info', 'blocked-words', 'saved to file', { count: sorted.length });
  } catch (err) {
    log('error', 'blocked-words', 'failed to save file', { error: err.message });
  }
}

function isSpam(comment) {
  if (comment.length > 300) return true;
  if (/^(.)\1+$/.test(comment.trim())) return true;
  const lower = comment.toLowerCase();
  for (const w of blockedWords) if (lower.includes(w)) return true;
  return false;
}

const ttsRequestTimes = [];

function isTTSRateLimited() {
  if (!config.rateLimitEnabled) return false;
  const now = Date.now();
  while (ttsRequestTimes.length && ttsRequestTimes[0] < now - config.TTS_RATE_WINDOW_MS)
    ttsRequestTimes.shift();
  if (ttsRequestTimes.length >= config.TTS_RATE_LIMIT_MAX) return true;
  ttsRequestTimes.push(now);
  return false;
}

// Broadcast to all connected browser clients
function broadcast(data) {
  const msg = JSON.stringify(data);
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

// Setup TikTok connection handlers (reusable for reconnect)
function setupTikTokConnection(cleanUsername) {
  if (tiktokConnection) {
    tiktokConnection.removeAllListeners();
  }
  tiktokConnection = new WebcastPushConnection(cleanUsername, {
    processInitialData: false,
    enableExtendedGiftInfo: false,
    enableWebsocketUpgrade: true,
    requestPollingIntervalMs: 2000,
  });

  tiktokConnection.on('chat', (data) => {
    log('debug', 'chat', 'raw', { preview: JSON.stringify(data).substring(0, 100) });
    if (!data.comment || !data.comment.trim()) return;
    if (isSpam(data.comment.trim())) return;
    broadcast({
      type: 'chat',
      user: data.nickname || data.uniqueId || 'Anónimo',
      comment: sanitizeForTTS(data.comment.trim()),
      timestamp: Date.now()
    });
  });

  tiktokConnection.on('gift', (data) => {
    if (data.giftType === 1 && !data.repeatEnd) return;
    broadcast({
      type: 'gift',
      user: data.nickname || data.uniqueId || 'Alguien',
      giftName: data.giftName,
      repeatCount: data.repeatCount || 1,
      timestamp: Date.now()
    });
  });

  tiktokConnection.on('like', (data) => {
    const userId = data.nickname || data.uniqueId || 'Alguien';

    if (likePendingTimers.has(userId)) {
      clearTimeout(likePendingTimers.get(userId).timer);
    } else {
      likePendingTimers.set(userId, { timer: null, count: 0 });
    }

    const pending = likePendingTimers.get(userId);
    pending.count += 1;
    pending.timer = setTimeout(() => {
      likePendingTimers.delete(userId);
      broadcast({
        type: 'like',
        user: userId,
        likeCount: pending.count,
        timestamp: Date.now()
      });
    }, config.LIKE_DEBOUNCE_MS);
  });

  tiktokConnection.on('member', (data) => {
    broadcast({
      type: 'join',
      user: data.nickname || data.uniqueId || 'Alguien',
      timestamp: Date.now()
    });
  });

  tiktokConnection.on('follow', (data) => {
    broadcast({
      type: 'follow',
      user: data.nickname || data.uniqueId || 'Alguien',
      timestamp: Date.now()
    });
  });

  tiktokConnection.on('disconnected', () => {
    broadcast({ type: 'disconnected' });
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS && currentUsername) {
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
      reconnectAttempts++;
      log('warn', 'reconnect', `Intento ${reconnectAttempts} en ${delay}ms`, { username: currentUsername });
      broadcast({ type: 'reconnecting', attempt: reconnectAttempts, delayMs: delay });
      reconnectTimer = setTimeout(() => attemptReconnect(currentUsername), delay);
    }
  });

  tiktokConnection.on('error', (err) => {
    broadcast({ type: 'error', message: err.message || 'Error de conexión' });
  });
}

async function attemptReconnect(username) {
  try {
    if (tiktokConnection) {
      try { tiktokConnection.disconnect(); } catch (e) {}
      tiktokConnection = null;
    }

    setupTikTokConnection(username);
    await tiktokConnection.connect();

    currentUsername = username;
    reconnectAttempts = 0;
    if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }

    broadcast({ type: 'connected', username });
    log('info', 'reconnect', 'Reconexion exitosa', { username });
  } catch (err) {
    log('error', 'reconnect', 'Fallo reconexion', { attempt: reconnectAttempts, error: err.message });
    if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS && currentUsername) {
      const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
      reconnectAttempts++;
      broadcast({ type: 'reconnecting', attempt: reconnectAttempts, delayMs: delay });
      reconnectTimer = setTimeout(() => attemptReconnect(username), delay);
    }
  }
}

// WebSocket connections from browser
wss.on('connection', (ws) => {
  clients.add(ws);
  log('info', 'ws', 'Browser client connected', { total: clients.size });

  ws.on('close', () => {
    clients.delete(ws);
    log('info', 'ws', 'Browser client disconnected', { total: clients.size });
  });
});

// Connect to TikTok Live
app.post('/api/connect', async (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ error: 'Se requiere el nombre de usuario' });
  }

  if (isConnecting) {
    return res.status(409).json({ error: 'Conexión ya en progreso' });
  }
  isConnecting = true;

  // Limpiar reconexión pendiente y conexión anterior
  currentUsername = null;
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  if (tiktokConnection) {
    tiktokConnection.removeAllListeners();
    try { tiktokConnection.disconnect(); } catch (e) {}
    tiktokConnection = null;
  }

  const cleanUsername = username.replace('@', '').trim();

  try {
    setupTikTokConnection(cleanUsername);
    await tiktokConnection.connect();

    currentUsername = cleanUsername;
    reconnectAttempts = 0;

    broadcast({ type: 'connected', username: cleanUsername });
    res.json({ success: true, username: cleanUsername });

  } catch (err) {
    log('error', 'connect', 'TikTok connection failed', { error: err.message });
    tiktokConnection = null;
    res.status(500).json({
      error: err.message.includes('LIVE')
        ? `@${cleanUsername} no está en vivo ahora mismo`
        : err.message.includes('not found')
        ? `Usuario @${cleanUsername} no encontrado`
        : `No se pudo conectar: ${err.message}`
    });
  } finally {
    isConnecting = false;
  }
});

// Disconnect
app.post('/api/disconnect', (req, res) => {
  currentUsername = null;
  reconnectAttempts = 0;
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  if (tiktokConnection) {
    tiktokConnection.removeAllListeners();
    likePendingTimers.clear();
    try { tiktokConnection.disconnect(); } catch (e) {}
    tiktokConnection = null;
  }
  broadcast({ type: 'disconnected' });
  res.json({ success: true });
});

// Text to Speech endpoint
app.post('/api/tts', async (req, res) => {
  const { text, voice = 'es' } = req.body;
  if (!text) return res.status(400).json({ error: 'Texto requerido' });
  if (isTTSRateLimited()) {
    return res.status(429).json({ error: 'Rate limit activo', retryAfter: config.TTS_RATE_WINDOW_MS });
  }
  const limitedText = sanitizeForTTS(text.substring(0, config.TTS_MAX_CHARS));
  log('info', 'tts', 'request', { voice, len: limitedText.length });

  // ── Google TTS (online, múltiples idiomas) ─────────────────
  try {
    const lang = voice.split('-')[0];
    const audioUrl = gTTS.getAudioUrl(limitedText, {
      lang: lang,
      slow: false,
      host: 'https://translate.google.com',
    });

    const req_tts = https.get(audioUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (audioRes) => {
      const contentType = audioRes.headers['content-type'] || '';
      const contentLen = parseInt(audioRes.headers['content-length'] || '0', 10);

      log('info', 'tts', 'Google response', { status: audioRes.statusCode, contentType, len: contentLen });

      if (audioRes.statusCode !== 200) {
        let errorBody = '';
        audioRes.on('data', chunk => { errorBody += chunk.toString().substring(0, 500); });
        audioRes.on('end', () => {
          log('error', 'tts', 'Google TTS HTTP error', { status: audioRes.statusCode, contentType, errorBody });
          res.status(500).json({ error: `Google TTS error: HTTP ${audioRes.statusCode}` });
        });
        return;
      }

      if (!contentType.includes('audio/mpeg') && !contentType.includes('audio')) {
        log('error', 'tts', 'Invalid content-type from Google', { contentType, len: contentLen });
        return res.status(500).json({ error: 'Invalid audio format from TTS service' });
      }

      if (contentLen < 1000) {
        log('warn', 'tts', 'Small audio response', { len: contentLen, contentType });
      }

      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Cache-Control', 'no-cache');
      audioRes.pipe(res);
    });

    req_tts.setTimeout(15000, () => {
      req_tts.destroy();
      log('error', 'tts', 'Google TTS timeout (15s)', { voice, textLen: limitedText.length });
      if (!res.headersSent) {
        res.status(500).json({ error: 'TTS service timeout' });
      }
    });

    req_tts.on('error', err => {
      log('error', 'tts', 'Google TTS network error', { error: err.message, voice });
      if (!res.headersSent) {
        res.status(500).json({ error: err.message });
      }
    });

  } catch (err) {
    log('error', 'tts', 'Google TTS failed', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// Available voices endpoint
app.get('/api/voices', (req, res) => {
  const voices = [];

  // ── Google TTS ──────────────────────────────────────────────
  const googleVoices = [
    // Español
    { id: 'es', name: '🇪🇸 Español (España)' },
    { id: 'es-MX', name: '🇲🇽 Español (México)' },
    { id: 'es-AR', name: '🇦🇷 Español (Argentina)' },

    // Inglés
    { id: 'en', name: '🇺🇸 English (USA)' },
    { id: 'en-GB', name: '🇬🇧 English (UK)' },

    // Portugués
    { id: 'pt', name: '🇧🇷 Português (Brasil)' },
    { id: 'pt-PT', name: '🇵🇹 Português (Portugal)' },

    // Francés
    { id: 'fr', name: '🇫🇷 Français' },

    // Alemán
    { id: 'de', name: '🇩🇪 Deutsch' },

    // Italiano
    { id: 'it', name: '🇮🇹 Italiano' },

    // Otros idiomas
    { id: 'ja', name: '🇯🇵 日本語 (Japonés)' },
    { id: 'zh-CN', name: '🇨🇳 中文 (Chino)' },
    { id: 'ru', name: '🇷🇺 Русский (Ruso)' },
    { id: 'ko', name: '🇰🇷 한국어 (Coreano)' },
  ];

  voices.push(...googleVoices);
  res.json(voices);
});

// Health check
app.get('/api/status', (req, res) => {
  res.json({
    connected: tiktokConnection !== null,
    wsClients: clients.size,
    uptime: Math.floor(process.uptime()),
    memoryMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    config,
    timestamp: new Date().toISOString()
  });
});

// Config dinámico
app.get('/api/config', (req, res) => res.json(config));

app.patch('/api/config', (req, res) => {
  const allowed = Object.keys(config);
  for (const [k, v] of Object.entries(req.body)) {
    if (allowed.includes(k) && typeof v === typeof config[k]) config[k] = v;
  }
  log('info', 'config', 'updated', config);
  res.json(config);
});

// Palabras bloqueadas
app.get('/api/blocked-words', (req, res) => res.json({ words: [...blockedWords] }));

app.get('/api/blocked-words/export', (req, res) => {
  try {
    if (!fs.existsSync(BLOCKED_WORDS_FILE)) return res.type('text/plain').send('');
    const content = fs.readFileSync(BLOCKED_WORDS_FILE, 'utf-8');
    res.type('text/plain').send(content);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/blocked-words/import', (req, res) => {
  const { content } = req.body;
  if (typeof content !== 'string') return res.status(400).json({ error: 'Se requiere content' });
  blockedWords.clear();
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const word = trimmed.slice(2).toLowerCase().trim();
      if (word) blockedWords.add(word);
    }
  }
  saveBlockedWordsToFile();
  res.json({ words: [...blockedWords] });
});

app.post('/api/block-word', (req, res) => {
  const { word } = req.body;
  if (word && typeof word === 'string') blockedWords.add(word.toLowerCase().trim());
  saveBlockedWordsToFile();
  res.json({ words: [...blockedWords] });
});

app.delete('/api/block-word', (req, res) => {
  const { word } = req.body;
  if (word) blockedWords.delete(word.toLowerCase().trim());
  saveBlockedWordsToFile();
  res.json({ words: [...blockedWords] });
});

// Cargar palabras bloqueadas al iniciar
loadBlockedWordsFromFile();

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n🎵 TikTok Live TTS corriendo en http://localhost:${PORT}\n`);
});
