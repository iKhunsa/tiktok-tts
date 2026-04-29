const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { WebcastPushConnection } = require('tiktok-live-connector');
const path = require('path');
const gTTS = require('google-tts-api');
const https = require('https');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

let tiktokConnection = null;
const clients = new Set();

// Broadcast to all connected browser clients
function broadcast(data) {
  const msg = JSON.stringify(data);
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

// WebSocket connections from browser
wss.on('connection', (ws) => {
  clients.add(ws);
  console.log('Browser client connected');

  ws.on('close', () => {
    clients.delete(ws);
    console.log('Browser client disconnected');
  });
});

// Connect to TikTok Live
app.post('/api/connect', async (req, res) => {
  const { username } = req.body;

  if (!username) {
    return res.status(400).json({ error: 'Se requiere el nombre de usuario' });
  }

  // Disconnect previous connection if exists
  if (tiktokConnection) {
    try {
      tiktokConnection.disconnect();
    } catch (e) {}
    tiktokConnection = null;
  }

  const cleanUsername = username.replace('@', '').trim();

  try {
    tiktokConnection = new WebcastPushConnection(cleanUsername, {
      processInitialData: false,
      enableExtendedGiftInfo: false,
      enableWebsocketUpgrade: true,
      requestPollingIntervalMs: 2000,
    });

    tiktokConnection.on('chat', (data) => {
      console.log('[CHAT RAW]', JSON.stringify(data).substring(0, 200));
      broadcast({
        type: 'chat',
        user: data.uniqueId || data.nickname || 'Anónimo',
        comment: data.comment,
        timestamp: Date.now()
      });
    });

    tiktokConnection.on('gift', (data) => {
      if (data.giftType === 1 && !data.repeatEnd) return;
      broadcast({
        type: 'gift',
        user: data.uniqueId || 'Alguien',
        giftName: data.giftName,
        repeatCount: data.repeatCount || 1,
        timestamp: Date.now()
      });
    });

    tiktokConnection.on('like', (data) => {
      broadcast({
        type: 'like',
        user: data.uniqueId || 'Alguien',
        likeCount: data.likeCount,
        timestamp: Date.now()
      });
    });

    tiktokConnection.on('member', (data) => {
      broadcast({
        type: 'join',
        user: data.uniqueId || 'Alguien',
        timestamp: Date.now()
      });
    });

    tiktokConnection.on('follow', (data) => {
      broadcast({
        type: 'follow',
        user: data.uniqueId || 'Alguien',
        timestamp: Date.now()
      });
    });

    tiktokConnection.on('disconnected', () => {
      broadcast({ type: 'disconnected' });
    });

    tiktokConnection.on('error', (err) => {
      broadcast({ type: 'error', message: err.message || 'Error de conexión' });
    });

    await tiktokConnection.connect();
    const state = tiktokConnection.getRoomInfo();

    broadcast({ type: 'connected', username: cleanUsername });
    res.json({ success: true, username: cleanUsername });

  } catch (err) {
    console.error('Error connecting:', err.message);
    tiktokConnection = null;
    res.status(500).json({
      error: err.message.includes('LIVE')
        ? `@${cleanUsername} no está en vivo ahora mismo`
        : err.message.includes('not found')
        ? `Usuario @${cleanUsername} no encontrado`
        : `No se pudo conectar: ${err.message}`
    });
  }
});

// Disconnect
app.post('/api/disconnect', (req, res) => {
  if (tiktokConnection) {
    try {
      tiktokConnection.disconnect();
    } catch (e) {}
    tiktokConnection = null;
    broadcast({ type: 'disconnected' });
  }
  res.json({ success: true });
});

// Text to Speech endpoint
app.post('/api/tts', async (req, res) => {
  const { text, voice = 'es' } = req.body;
  console.log('[TTS REQ] text:', JSON.stringify(text), '| voice:', voice);
  if (!text) return res.status(400).json({ error: 'Texto requerido' });
  const limitedText = text.substring(0, 500);

  console.log(`[TTS] Solicitado: voice="${voice}", text="${limitedText.substring(0, 50)}..."`);

  // ── Google TTS (online, múltiples idiomas) ─────────────────
  try {
    const lang = voice.split('-')[0];
    console.log(`[TTS] Usando Google TTS: idioma=${lang}`);
    const audioUrl = gTTS.getAudioUrl(limitedText, {
      lang: lang,
      slow: false,
      host: 'https://translate.google.com',
    });

    https.get(audioUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (audioRes) => {
      res.setHeader('Content-Type', 'audio/mpeg');
      audioRes.pipe(res);
    }).on('error', err => res.status(500).json({ error: err.message }));

  } catch (err) {
    console.error('Google TTS Error:', err);
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

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n🎵 TikTok Live TTS corriendo en http://localhost:${PORT}\n`);
});
