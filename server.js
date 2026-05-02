const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { WebcastPushConnection } = require('tiktok-live-connector');
const path = require('path');
const gTTS = require('google-tts-api');
const https = require('https');
const fs = require('fs');
const multer = require('multer');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Uploads directory for custom overlay backgrounds
const UPLOADS_DIR = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const uploadStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    const name = `bg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, name);
  }
});

const upload = multer({
  storage: uploadStorage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB max
  fileFilter: (_req, file, cb) => {
    const allowedMime = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif'];
    const allowedExt = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedMime.includes(file.mimetype) || allowedExt.includes(ext)) cb(null, true);
    else cb(new Error('Solo se permiten imágenes PNG, JPG, WebP o GIF'));
  }
});

app.use(express.static(path.join(__dirname, 'public')));
app.use('/gifts', express.static(path.join(__dirname, 'gifts')));
app.use('/uploads', express.static(UPLOADS_DIR));
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

const overlayState = {
  followCount: 0,
  baseFollowerCount: 0,
  topLikers: new Map(),
};
let followerRefreshTimer = null;
function resetOverlayState() {
  overlayState.followCount = 0;
  overlayState.topLikers.clear();
  overlayState.baseFollowerCount = 0;
}

function log(level, ctx, msg, data = null) {
  const fn = level === 'error' ? console.error : console.log;
  fn(JSON.stringify({ ts: new Date().toISOString(), level, ctx, msg, ...(data && { data }) }));
}

function extractFollowerCount(roomInfo) {
  try {
    const owner = roomInfo && roomInfo.owner;
    const fi = owner && (owner.follow_info || owner.followInfo);
    const count = fi && (fi.follower_count || fi.followerCount || fi.fan_count || fi.fanCount);
    if (typeof count === 'number' && count > 0) return count;
  } catch (e) {}
  return 0;
}

function startFollowerRefresh() {
  stopFollowerRefresh();
  followerRefreshTimer = setInterval(async () => {
    if (!tiktokConnection || !currentUsername) return;
    try {
      const roomInfo = await tiktokConnection.getRoomInfo();
      const newCount = extractFollowerCount(roomInfo);
      if (newCount > 0 && newCount !== overlayState.baseFollowerCount) {
        overlayState.baseFollowerCount = newCount;
        broadcast({ type: 'follower-base', count: newCount });
        log('info', 'followers', 'Base follower count refreshed', { count: newCount });
      }
    } catch (err) {
      log('warn', 'followers', 'Failed to refresh follower count', { error: err.message });
    }
  }, 5 * 60 * 1000);
}

function stopFollowerRefresh() {
  if (followerRefreshTimer) {
    clearInterval(followerRefreshTimer);
    followerRefreshTimer = null;
  }
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
      giftId: data.giftId,
      giftPictureUrl: data.giftPictureUrl || null,
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
    pending.count += (data.likeCount || 1);
    pending.timer = setTimeout(() => {
      likePendingTimers.delete(userId);
      broadcast({
        type: 'like',
        user: userId,
        likeCount: pending.count,
        timestamp: Date.now()
      });
      const existing = overlayState.topLikers.get(userId) || { user: userId, totalLikes: 0 };
      existing.totalLikes += pending.count;
      overlayState.topLikers.set(userId, existing);
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
    overlayState.followCount += 1;
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

    resetOverlayState();
    setupTikTokConnection(username);
    const state = await tiktokConnection.connect();

    const baseCount = extractFollowerCount(state && state.roomInfo);
    if (baseCount > 0) {
      overlayState.baseFollowerCount = baseCount;
      broadcast({ type: 'follower-base', count: baseCount });
    }
    startFollowerRefresh();

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

  resetOverlayState();

  try {
    setupTikTokConnection(cleanUsername);
    const state = await tiktokConnection.connect();

    const baseCount = extractFollowerCount(state && state.roomInfo);
    if (baseCount > 0) {
      overlayState.baseFollowerCount = baseCount;
      broadcast({ type: 'follower-base', count: baseCount });
      log('info', 'connect', 'Base follower count extracted', { count: baseCount });
    }
    startFollowerRefresh();

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
  stopFollowerRefresh();
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
    { id: 'es', name: 'Español (España)', flag: 'ES' },
    { id: 'es-MX', name: 'Español (México)', flag: 'MX' },
    { id: 'es-AR', name: 'Español (Argentina)', flag: 'AR' },

    // Inglés
    { id: 'en', name: 'English (USA)', flag: 'US' },
    { id: 'en-GB', name: 'English (UK)', flag: 'GB' },

    // Portugués
    { id: 'pt', name: 'Português (Brasil)', flag: 'BR' },
    { id: 'pt-PT', name: 'Português (Portugal)', flag: 'PT' },

    // Francés
    { id: 'fr', name: 'Français', flag: 'FR' },

    // Alemán
    { id: 'de', name: 'Deutsch', flag: 'DE' },

    // Italiano
    { id: 'it', name: 'Italiano', flag: 'IT' },

    // Otros idiomas
    { id: 'ja', name: '日本語 (Japonés)', flag: 'JP' },
    { id: 'zh-CN', name: '中文 (Chino)', flag: 'CN' },
    { id: 'ru', name: 'Русский (Ruso)', flag: 'RU' },
    { id: 'ko', name: '한국어 (Coreano)', flag: 'KR' },
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

// Overlay stats for initial hydration
app.get('/api/overlay-stats', (req, res) => {
  const topLikers = [...overlayState.topLikers.values()]
    .sort((a, b) => b.totalLikes - a.totalLikes)
    .slice(0, 10);
  res.json({ followCount: overlayState.followCount, baseFollowerCount: overlayState.baseFollowerCount, topLikers });
});

// Gift file list for overlay name→filename mapping
app.get('/api/gifts-list', (req, res) => {
  const giftsDir = path.join(__dirname, 'gifts');
  try {
    const files = fs.readdirSync(giftsDir).filter(f => f.endsWith('.png'));
    res.json(files);
  } catch (e) { res.json([]); }
});

// Upload custom background image
app.post('/api/upload-bg', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió ninguna imagen' });
  const url = `/uploads/${req.file.filename}`;
  log('info', 'upload-bg', 'Background uploaded', { url, size: req.file.size });
  res.json({ url });
});

app.delete('/api/upload-bg', (req, res) => {
  const { filename } = req.body;
  if (!filename || typeof filename !== 'string') {
    return res.status(400).json({ error: 'Se requiere filename' });
  }
  const safeName = path.basename(filename);
  const filePath = path.join(UPLOADS_DIR, safeName);
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      log('info', 'upload-bg', 'Background deleted', { filename: safeName });
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Archivo no encontrado' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Test endpoints
app.post('/api/test/gift', (req, res) => {
  const giftsDir = path.join(__dirname, 'gifts');
  try {
    const files = fs.readdirSync(giftsDir).filter(f => f.endsWith('.png'));
    if (files.length === 0) return res.status(500).json({ error: 'No hay imágenes de regalos' });
    const file = files[Math.floor(Math.random() * files.length)];
    const match = file.match(/^\d+_(.+)\.png$/i);
    const giftName = match ? match[1].replace(/_/g, ' ') : 'Regalo';
    const testUsers = ['TestUser', 'FanRandom', 'ViewerPro', 'TikToker', 'StreamerFan'];
    const user = testUsers[Math.floor(Math.random() * testUsers.length)] + Math.floor(Math.random() * 99);
    broadcast({
      type: 'gift',
      user,
      giftName,
      repeatCount: 1,
      timestamp: Date.now(),
      test: true,
      duration: 10000,
    });
    log('info', 'test', 'Test gift broadcasted', { user, giftName });
    res.json({ success: true, user, giftName });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/test/follow', (req, res) => {
  const testUsers = ['TestUser', 'FanRandom', 'ViewerPro', 'TikToker', 'StreamerFan'];
  const user = testUsers[Math.floor(Math.random() * testUsers.length)] + Math.floor(Math.random() * 99);
  broadcast({ type: 'follow', user, timestamp: Date.now() });
  overlayState.followCount += 1;
  log('info', 'test', 'Test follow broadcasted', { user });
  res.json({ success: true, user });
});

app.post('/api/test/likes', (req, res) => {
  const testUsers = ['LikeKing', 'FanTotal', 'TikTokLover', 'SuperViewer', 'HeartGiver', 'StreamFan', 'TopLiker', 'MegaFan'];
  const count = Math.floor(Math.random() * 6) + 5;
  for (let i = 0; i < count; i++) {
    const user = testUsers[i % testUsers.length] + Math.floor(Math.random() * 99);
    const likeCount = Math.floor(Math.random() * 490) + 10;
    broadcast({
      type: 'like',
      user,
      likeCount,
      timestamp: Date.now() + i,
    });
  }
  log('info', 'test', 'Test likes broadcasted', { count });
  res.json({ success: true, count });
});

// Cargar palabras bloqueadas al iniciar
loadBlockedWordsFromFile();

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\nTikTok Live TTS corriendo en http://localhost:${PORT}\n`);
});
