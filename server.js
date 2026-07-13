const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const { WebcastPushConnection } = require('tiktok-live-connector');
const path = require('path');
const gTTS = require('google-tts-api');
const https = require('https');
const fs = require('fs');
const multer = require('multer');
const crypto = require('crypto');
const os = require('os');
const QRCode = require('qrcode');
const { createMusicEngine } = require('./music-engine');

const RESOURCE_BASE = process.env.TIKTOK_RESOURCES_PATH || __dirname;
const DATA_BASE = process.env.TIKTOK_USER_DATA_PATH || RESOURCE_BASE;

// Motor de música (yt-dlp): búsqueda, metadata y streaming de audio.
// log/broadcast son function declarations (hoisted); los callbacks corren después.
const musicEngine = createMusicEngine({
  dataDir: DATA_BASE,
  log: (...args) => log(...args),
  onStatus: (s) => {
    if (s.state === 'downloading') broadcast({ type: 'music-engine', status: 'downloading' });
    else if (s.state === 'error') broadcast({ type: 'music-engine', status: 'error', error: s.error });
  },
});

const app = express();
const server = http.createServer(app);

function getRequestHostname(hostHeader = '') {
  const raw = String(hostHeader || '').trim().toLowerCase();
  if (!raw) return '';
  if (raw.startsWith('[')) return raw.slice(1, raw.indexOf(']'));
  return raw.split(':')[0];
}

function isLocalHostname(hostname) {
  return ['localhost', '127.0.0.1', '::1'].includes(String(hostname || '').toLowerCase());
}

// Heurística best-effort: no hay forma fiable de saber cuál interfaz es "la"
// LAN del usuario; se filtran virtuales y se priorizan los rangos domésticos
// típicos (192.168.x, luego 10.x) sobre el resto.
function getLocalIPCandidates() {
  const VIRTUAL_SKIP = /virtual|vbox|vmnet|vmware|hyper.?v|vethernet|docker|loopback/i;
  // 192.168.56.x and 192.168.99.x are VirtualBox/Docker defaults
  const VIRTUAL_IP = /^192\.168\.(56|99)\./;
  const nets = os.networkInterfaces();
  const candidates = [];
  for (const [name, ifaces] of Object.entries(nets)) {
    if (VIRTUAL_SKIP.test(name)) continue;
    for (const iface of ifaces) {
      if (iface.family !== 'IPv4' || iface.internal) continue;
      if (VIRTUAL_IP.test(iface.address)) continue;
      candidates.push(iface.address);
    }
  }
  const rank = (ip) => (/^192\.168\./.test(ip) ? 0 : /^10\./.test(ip) ? 1 : 2);
  candidates.sort((a, b) => rank(a) - rank(b));
  return candidates;
}

function getLocalIP() {
  return getLocalIPCandidates()[0] || '127.0.0.1';
}

function isPrivateIP(ip) {
  if (!ip) return false;
  const s = String(ip);
  return (
    s === '127.0.0.1' ||
    s === '::1' ||
    /^10\./.test(s) ||
    /^192\.168\./.test(s) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(s)
  );
}

// Server-side state mirror so mobile clients can sync
let mobileState = {
  ttsGlobalEnabled: true,
  ttsPaused: false,
  streamTimerRunning: false,
  options: {
    readChat: true, readGifts: true, readJoins: true,
    readFollows: true, readLikes: true, readShares: true, sayUsername: true,
  },
  clips: [],
  soundPads: [],
  music: {
    enabled: true,
    current: null,
    queueLength: 0,
    volume: 0.5,
    playlistEnabled: false,
    playlistActive: false,
    playlistIndex: 0,
    playlistTotal: 0,
  },
};

function isAllowedWsClient(info) {
  const host = getRequestHostname(info.req.headers.host);
  const clientIp = info.req.socket?.remoteAddress?.replace(/^::ffff:/, '');
  // Allow localhost or private network clients (mobile on same WiFi)
  if (!isLocalHostname(host) && !isPrivateIP(clientIp)) return false;
  const origin = info.origin || info.req.headers.origin;
  if (!origin) return true;
  try {
    const oh = new URL(origin).hostname;
    return isLocalHostname(oh) || isPrivateIP(oh);
  } catch (_) {
    return false;
  }
}

const wss = new WebSocket.Server({ server, verifyClient: isAllowedWsClient });

// Uploads directory for custom overlay backgrounds
const UPLOADS_DIR = path.join(DATA_BASE, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Sound Pad directory and config
const SOUNDS_DIR = path.join(DATA_BASE, 'sounds');
fs.mkdirSync(SOUNDS_DIR, { recursive: true });
const SOUNDS_CONFIG_PATH = path.join(DATA_BASE, 'sounds-config.json');

function loadSounds() {
  try {
    return JSON.parse(fs.readFileSync(SOUNDS_CONFIG_PATH, 'utf8'));
  } catch (_) {
    return [];
  }
}

function saveSounds(sounds) {
  fs.writeFileSync(SOUNDS_CONFIG_PATH, JSON.stringify(sounds, null, 2), 'utf8');
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
    if (allowedMime.includes(file.mimetype) && allowedExt.includes(ext)) cb(null, true);
    else cb(new Error('Solo se permiten imágenes PNG, JPG, WebP o GIF'));
  }
});

function validateLocalMutation(req, res, next) {
  // Mobile routes are allowed from private network IPs
  if (req.path.startsWith('/api/mobile') || req.path === '/mobile') return next();

  if (!['POST', 'PATCH', 'DELETE', 'PUT'].includes(req.method)) return next();

  const host = getRequestHostname(req.headers.host);
  if (!isLocalHostname(host)) {
    return res.status(403).json({ error: 'Host no permitido' });
  }

  const source = req.headers.origin || req.headers.referer;
  if (source) {
    try {
      if (!isLocalHostname(new URL(source).hostname)) {
        return res.status(403).json({ error: 'Origen no permitido' });
      }
    } catch (_) {
      return res.status(403).json({ error: 'Origen no permitido' });
    }
  }

  return next();
}

function validateMobileRequest(req, res, next) {
  const clientIp = req.socket?.remoteAddress?.replace(/^::ffff:/, '');
  if (!isPrivateIP(clientIp) && !isLocalHostname(clientIp)) {
    return res.status(403).json({ error: 'Solo acceso desde red local' });
  }
  return next();
}

app.use(validateLocalMutation);
app.use(express.static(path.join(RESOURCE_BASE, 'public')));
app.use('/gifts', express.static(path.join(RESOURCE_BASE, 'gifts')));
app.use('/uploads', express.static(UPLOADS_DIR));
app.use('/sounds', express.static(SOUNDS_DIR));
app.use(express.json());

// Multi-channel state: username → { conn, attempts, timer }
const tiktokChannels = new Map();
const connectingTiktok = new Set();
const MAX_RECONNECT_ATTEMPTS = 5;

// ── BACKWARD-COMPAT helpers (used by status) ────────────────────────────────
function anyTiktokConnected() { return tiktokChannels.size > 0; }

// TikTok gift prices in coins (what the viewer pays). 100 coins ≈ $1.03 (ver TIKTOK_COINS_USD = 0.0103/coin).
// Source: official gift list (810 images, 550 with known prices).
const TIKTOK_GIFT_COINS = {
  // 1 coin
  'Rose': 1, 'Flame heart': 1, 'Love you so much': 1, 'Youre awesome': 1,
  'Heart Puff': 1, 'TikTok': 1, 'Wink wink': 1, 'Freestyle': 1, 'Oldies': 1,
  'Pop': 1, 'Cool': 1, 'My First Rose': 1, 'Heart': 1, 'Cake Slice': 1,
  'Lightning Bolt': 1, 'GOAT': 1, 'GG': 1, 'Ice Cream Cone': 1, 'Creeper': 1,
  'Congratulations': 1, 'So Cute': 1, 'Love you': 1, 'Music Album': 1,
  'coldy': 1, 'Red Lightning': 1, 'Blue Lightning': 1, 'Yellow Lightning': 1,
  'Wink Charm': 1, 'Go Popular': 1, 'Club Cheers': 1, 'Its corn': 1,
  // 2 coins
  'Team Bracelet': 2,
  // 5 coins
  'Overreact': 5, 'Finger Heart': 5, 'Name shoutout': 5, 'Gamer Level Up': 5,
  // 9 coins
  'Super Popular': 9, 'Club Power': 9,
  // 10 coins
  'Gamer Tater': 10, 'League Ball': 10, 'Journey Pass': 10, 'Slow motion': 10,
  'Gold Boxing Gloves': 10, 'Lucky Pony': 10, 'FANDOM Fan': 10, 'Chocolate': 10,
  'Style Me Up': 10, 'Banana Peel': 10, 'Heart Gaze': 10, 'Friendship Necklace': 10,
  'Dolphin': 10,
  // 15 coins
  'Bravo': 15,
  // 20 coins
  'Perfume': 20, 'Traffic Cone': 20,
  // 30 coins
  'Capybara': 30, 'You are my Jam': 30, 'Doughnut': 30, 'Energy Capsule': 30,
  // 88 coins
  'Butterfly': 88,
  // 90 coins
  'Fist Bump': 90,
  // 99 coins
  'Cupids Bow': 99, 'Sundae Bowl': 99, 'Mark of Love': 99, 'Bubble Gum': 99,
  'Love Painting': 99, 'Like-Pop': 99, 'Hat and Mustache': 99, 'Cap': 99,
  'Little Crown': 99, 'Paper Crane': 99, 'Greeting Heart': 99, 'Club Victory': 99,
  // 100 coins
  'Mishka Bear': 100, 'Hand Hearts': 100, 'Confetti': 100, 'FANDOM Stamp': 100,
  'Power Chip': 100, 'Singing Magic': 100, 'Marvelous Confetti': 100, 'Super GG': 100,
  'Game Controller': 100,
  // 149 coins
  'Fairy Hide': 149, 'Love Glasses': 149, 'Santa Cocoa': 149, 'Raving Snail': 149,
  'Catrina': 149, 'Caterpillar Chaos': 149, 'Feather Tiara': 149, 'Balloon Crown': 149,
  'Masquerade': 149, 'Chatting Popcorn': 149, 'Big Shout Out': 149, 'Bowknot': 149,
  // 150 coins
  'Potato Transformation': 150, 'Moonwalk': 150,
  // 199 coins
  'Party Pony': 199, 'Heart Hood': 199, 'Joker Ball': 199, 'Chirpy Kisses': 199,
  'Rose Hand': 199, 'Sour Buddy': 199, 'Flower Headband': 199, 'Floating Octopus': 199,
  'Cheering Crab': 199, 'Coffee Magic': 199, 'Massage for You': 199,
  'Stinging Bee': 199, 'Garland Headpiece': 199, 'Hearts': 199, 'Sunglasses': 199,
  'League Countdown': 199, 'Cheer For You': 199, 'Night Star': 199,
  'Twinkling Star': 199, 'Melon Juice': 199, 'Fan Cat': 199,
  'Gamer Cat': 199, 'Blow Bubbles': 199,
  // 200 coins
  'Magic Genie': 200, 'Gold Medal': 200, 'Tiny Diny Trek': 200,
  'I Love TikTok LIVE': 200,
  // 214 coins
  'Rose Bear': 214,
  // 249 coins
  'Amped Up': 249, 'Snow Bloom': 249, 'Sweet Flutter': 249, 'Dreamy Strings': 249,
  'Party Blossom': 249, 'Surfing Penguin': 249, 'Melodic birds': 249,
  'Treasured Voice': 249, 'Forest Elf': 249, 'Palm Breeze': 249,
  'Music Bubbles': 249, 'Cheer Mic': 249, 'Star Goggles': 249, 'Ice Cream Mic': 249,
  'Candy Bouquet': 249, 'Pinch Face': 249, 'Furry Friends': 249,
  // 299 coins
  'Boxing Gloves': 299, 'Sax Groove': 299, 'Wakey Mallow': 299, 'Spring Sprout': 299,
  'Pony Lantern': 299, 'Love Call': 299, 'Music Mate': 299, 'Penguin Snowpal': 299,
  'Melody Glasses': 299, 'Bat Headwear': 299, 'Go Hamster': 299, 'Hi Rosie': 299,
  'Kicker Challenge': 299, 'United Heart': 299, 'Puppy Kisses': 299,
  'Butterfly for You': 299, 'Rock Star': 299, 'Play for You': 299,
  'Naughty Chicken': 299, 'Fruit Friends': 299, 'Elephant trunk': 299,
  'Corgi': 299, 'LIVE Ranking Crown': 299, 'EID Gift Box': 299, 'Scroll': 299,
  'Budding Heart': 299, 'Journal': 299,
  // 300 coins
  'Feather Mask': 300, 'Air Dancer': 300,
  // 349 coins
  'Vinyl Flip': 349, 'Beach Maracas': 349, 'Spring Bouquet': 349, 'Sparkle Pony': 349,
  'Rocking Shroom': 349, 'Gingerbread Man': 349, 'Vintage flight': 349,
  'Mystic Drink': 349, 'Batwing Hat': 349, 'Become Kitten': 349,
  'Festival Bracelet': 349,
  // 398 coins
  'Singing Frogs': 398,
  // 399 coins
  'Alien Buddy': 399, 'Panda Snap': 399, 'Cactus Shuffle': 399, 'Vocal Bear': 399,
  'Dreamy Hat': 399, 'Blossom Fairy': 399, 'Fairy Locket': 399, 'Singing Sax': 399,
  'Confetti Bear': 399, 'Santa Owl Surprise': 399, 'Tiger Lift': 399,
  'Rosies Concert': 399, 'Shoot the Apple': 399, 'Kitten Kneading': 399,
  'Let butterfly dances': 399, 'Sage the Smart Bean': 399, 'Rocky the Rock Bean': 399,
  'Jollie the Joy Bean': 399, 'Rosie the Rose Bean': 399, 'Toms Hug': 399,
  'Relaxed Goose': 399, 'Magic Rhythm': 399, 'Forever Rosa': 399,
  'Cotton the Seal': 399, 'Sages Slash': 399, 'Health Potion': 399,
  'Flower flight': 399, 'You Are Loved': 399,
  // 400 coins
  'DJ Wave': 400, 'Cheeky Pup': 400, 'Reindeer Milk': 400, 'Taraxacum Corgi': 400,
  'Bounce Speakers': 400, 'Mic Champ': 400, 'Wishing Cake': 400,
  'Crystal Dreams': 400, 'FANDOM Fever': 400,
  // 449 coins
  'Clown Boogie': 449, 'Xmas Tree Hat': 449, 'Space Love': 449, 'Batting Cutie': 449,
  'Captured Vocals': 449, 'Candy Loot': 449, 'Pirates Treasure': 449,
  'Encore Clap': 449, 'Beating Heart': 449,
  // 450 coins
  'Sloth Peek': 450, 'Clover Hat': 450, 'Superwoman': 450, 'Paw Call': 450,
  'Cupid Koala': 450, 'City Pop': 450, 'Celebration Hat': 450,
  'Music Conductor': 450, 'Halloween Fun Hat': 450, 'Hat of Joy': 450,
  'Powerful Mind': 450,
  // 499 coins
  'Panda Hug': 499, 'Sakura Corgi': 499, 'Coral': 499, 'Hands Up': 499,
  // 500 coins
  'Diamond Microphone': 500, 'Starry Fluff': 500, 'Heart Guitar': 500,
  'Mystery Box': 500, 'Cozy Xmas Set': 500, 'Prince': 500, 'Bunny Crown': 500,
  'Flower Show': 500, 'XXXL Flowers': 500, 'Dragon Crown': 500, 'Couch Potato': 500,
  'Manifesting': 500, 'DJ Glasses': 500, 'VR Goggles': 500, 'Youre Amazing': 500,
  'Money Gun': 500, 'Baby Chicks': 500, 'Magic Prop': 500, 'Prairie Diny': 500,
  'Prairie Tom': 500, 'Prairie Blitzy': 500, 'Prairie Cooper': 500,
  'Jungle Diny': 500, 'Jungle Tom': 500, 'Jungle Blitzy': 500, 'Jungle Cooper': 500,
  'Gem Gun': 500, 'Star Map Polaris': 500, 'Bouquet': 500, 'Gardening': 500,
  'Racing Helmet': 500, 'Shell of a Warrior': 500, 'Goal': 500,
  // 549 coins
  'Drum Hamster': 549, 'Hive Escape': 549,
  // 599 coins
  'League Trophy': 599, 'Fully Bloomed Sakura': 599,
  // 649 coins
  'Seahorse Pop': 649,
  // 699 coins
  'Swan': 699,
  // 700 coins
  'Colorful Wings': 700,
  // 800 coins
  'Love Flight': 800,
  // 899 coins
  'Train': 899,
  // 999 coins
  'Travel with You': 999, 'Lucky Airdrop Box': 999, 'Trending Figure': 999,
  // 1000 coins
  'Dinosaur': 1000, 'Fairy Wings': 1000, 'Flamingo Groove': 1000, 'Galaxy': 1000,
  'Firepit Diny': 1000, 'Firepit Tom': 1000, 'Firepit Blitzy': 1000,
  'Firepit Cooper': 1000, 'Desert Diny': 1000, 'Desert Tom': 1000,
  'Desert Blitzy': 1000, 'Desert Cooper': 1000, 'Tundra Diny': 1000,
  'Tundra Tom': 1000, 'Tundra Blitzy': 1000, 'Tundra Cooper': 1000,
  'Magic Potion': 1000, 'Sparkle Dance': 1000, 'Shiny air balloon': 1000,
  'Watermelon Love': 1000, 'Joy Floats': 1030, 'Blooming Ribbons': 1000,
  'Glowing Jellyfish': 1000, 'Gerry the Giraffe': 1000, 'Disco ball': 1000,
  'Super LIVE Star': 1000,
  // 1088 coins
  'Fireworks': 1088, 'Magic Role': 1088,
  // 1099 coins
  'Diamond': 1099,
  // 1200 coins
  'Umbrella of Love': 1200,
  // 1300 coins
  'Party Laser': 1300,
  // 1400 coins
  'Vibrant Stage': 1400,
  // 1500 coins
  'EWC Trophy': 1500, 'Galaxy Globe': 1500, 'Wild Mic': 1500, 'Racing Debut': 1500,
  'Astrobear': 1500, 'Under Control': 1500, 'Future Encounter': 1500,
  'Greeting Card': 1500, 'Lovers Lock': 1500, 'Chasing the Dream': 1500,
  'Level Ship': 1500, 'Raya Gift Card': 1500, 'Viking Hammer': 1500,
  'Youre So Fly': 1500,
  // 1599 coins
  'Blooming Heart': 1599,
  // 1799 coins
  'Here We Go': 1799,
  // 1800 coins
  'Fox Legend': 1800, 'Love Drop': 1800,
  // 1999 coins
  'Mystery Firework': 1999, 'Cooper Flies Home': 1999,
  'Doll New Year Greeting': 1999, 'Star of Red Carpet': 1999, 'Egg Hunt': 1999,
  // 2000 coins
  'Club Music': 2000, 'Crystal Crown': 2000, 'Baby Dragon': 2000, 'Sky Drift': 2000,
  // 2150 coins
  'Whale Diving': 2150,
  // 2199 coins
  'Sages Coinbot': 2199, 'Rockys Punch': 2199, 'Blow Rosie Kisses': 2199,
  // 2200 coins
  'Wave Lights': 2200,
  // 2500 coins
  'Animal Band': 2500, 'FANDOM Cheer': 2500,
  // 2988 coins
  'Motorcycle': 2988, 'Pink Dream': 2988,
  // 2999 coins
  'Party Bus': 2999, 'Rhythmic Bear': 2999, 'Ring Of Honor-Cube': 2999,
  'Surprise Baby Mob': 2999, 'Level-up Spotlight': 2999,
  // 3000 coins
  'Meteor Shower': 3000, 'Summoning Horn': 3000,
  // 3088 coins
  'Sea Diny': 3088, 'Sea Tom': 3088, 'Sea Blitzy': 3088, 'Sea Cooper': 3088,
  // 3200 coins
  'Hip-Hop Hen': 3200,
  // 3350 coins
  'Look Up': 3350, 'Dream Big': 3350,
  // 3999 coins
  'Go Home': 3999,
  // 4088 coins
  'Shine Bright': 4088,
  // 4500 coins
  'Your Concert': 4500, 'Award': 4500,
  // 4888 coins
  'Fiery Dragon': 4888, 'Leon the Kitten': 4888, 'Private Jet': 4888,
  'Dynamic Music': 4888,
  // 4918 coins
  'Sugar Whiskers': 4918,
  // 4999 coins
  'Hero Space Ship': 4999, 'Sages Venture': 4999,
  // 5000 coins
  'Diamond Gun': 5000, 'Flying Jets': 5000, 'League Fandom': 5000,
  'Leons Sigil Cape': 5000, 'Unicorn Fantasy': 5000,
  // 5500 coins
  'Wolf': 5500,
  // 5888 coins
  'Cub on Clouds': 5888, 'Valiant Odyssey': 5888,
  // 5999 coins
  'Devoted Heart': 5999,
  // 6000 coins
  'Strong Finish': 6000, 'Work Hard Play Harder': 6000, 'Future City': 6000,
  'Chick Stampede': 6000, 'Sam in New City': 6000,
  // 6599 coins
  'Lili the Leopard': 6599,
  // 6999 coins
  'Celebration Time': 6999, 'Happy Party': 6999,
  // 7000 coins
  'Sports Car': 7000,
  // 7238 coins
  'Majestic Hearts': 7238,
  // 7999 coins
  'Star Throne': 7999,
  // 8000 coins
  'Ultimate FANDOM': 8000,
  // 9699 coins
  'Leon and Lili': 9699,
  // 10000 coins
  'Octopus': 10000, 'Sunset Speedway': 10000, 'Interstellar': 10000,
  // 10999 coins
  'Falcon': 10999,
  // 12000 coins
  'Convertible car': 12000,
  // 12999 coins
  'Level-up Spectacle': 12999,
  // 14999 coins
  'Invincible Hammer': 14999, 'Tidecaller Trident': 14999, 'Crystal Heart': 14999,
  // 15000 coins
  'Time for Family': 15000, 'Stallion': 15000, 'Party OnOn': 15000,
  'Future Journey': 15000, 'Pyramids': 15000, 'Rosa Nebula': 15000,
  'Leopard': 15000, 'Battle Champion': 15000, 'Sneaky Jockey': 15000,
  'Paris': 15000, 'Crocodile': 15000, 'Golden Gallop': 15000, 'Pirate ship': 15000,
  // 17000 coins
  'Amusement Park': 17000,
  // 19999 coins
  'Fly Love': 19999,
  // 20000 coins
  'TikTok Shuttle': 20000, 'Castle Fantasy': 20000, 'Premium Shuttle': 20000,
  // 23999 coins
  'Infinite Heart': 23999,
  // 25999 coins
  'Adams Dream': 25999, 'Phoenix': 25999, 'Cyber Roar': 25999,
  'Undersea Kingdom': 25999, 'Griffin': 25999,
  // 26999 coins
  'Dragon Flame': 26999,
  // 29999 coins
  'Lion': 29999,
  // 30000 coins
  'Gorilla': 30000, 'Sam the whale': 30000,
  // 34000 coins
  'Zeus': 34000, 'Leon and Lion': 34000,
  // 39999 coins
  'TikTok Stars': 39999, 'Thunder Falcon': 39999,
  // 41999 coins
  'Fire Phoenix': 41999,
  // 42999 coins
  'Legend Marcellus': 42999, 'Pegasus': 42999,
  // 43999 coins
  'Julius the Champion': 43999,
  // 44999 coins
  'TikTok Universe': 44999,
};

const TIKTOK_COINS_USD = 0.0103; // 100 coins = $1.03 USD. Estimación; el precio real por coin varía por región/paquete.
// Modelo de unidades: coins = lo que paga el viewer; diamonds = lo que recibe el creador.
// En TikTok 1 coin ≈ 2 diamonds → coins = diamonds / DIAMONDS_PER_COIN.
const DIAMONDS_PER_COIN = 2;

// Única fuente de verdad para valorar regalos en USD (usada por el handler real y los endpoints de test).
function computeGiftUsd({ giftName, repeatCount = 1, diamondCount = 0 } = {}) {
  const lookedUpCoins = TIKTOK_GIFT_COINS[giftName];
  let perGiftCoins = null;
  if (lookedUpCoins != null) {
    perGiftCoins = lookedUpCoins;
  } else if (diamondCount > 0) {
    perGiftCoins = diamondCount / DIAMONDS_PER_COIN;
  }
  // Sin datos: no inventar un valor
  if (perGiftCoins == null || perGiftCoins <= 0) return { totalCoins: 0, usdValue: null };
  const totalCoins = perGiftCoins * repeatCount;
  const usdRaw = totalCoins * TIKTOK_COINS_USD;
  return { totalCoins, usdValue: usdRaw > 0 ? usdRaw.toFixed(2) : null };
}
const GOOGLE_TTS_LANGS = new Set(['es-MX', 'en', 'en-GB', 'pt', 'pt-PT', 'fr', 'de', 'it', 'ja', 'zh-CN', 'ru', 'ko']);

const clients = new Set();
const serverLogs = [];
const MAX_SERVER_LOGS = 250;
const likePendingTimers = new Map();
function clearLikePendingTimers() {
  for (const pending of likePendingTimers.values()) {
    if (pending && pending.timer) clearTimeout(pending.timer);
  }
  likePendingTimers.clear();
}
const CONFIG_FILE = path.join(DATA_BASE, 'config.json');
const DEFAULT_CONFIG = {
  LIKE_DEBOUNCE_MS: 1500,
  TTS_MAX_CHARS: 500,
  rateLimitEnabled: false,
  TTS_RATE_LIMIT_MAX: 10,
  TTS_RATE_WINDOW_MS: 5000,
  MAX_QUEUE_MSG: 15,
  musicEnabled: true,
  musicUserCooldownMs: 60000,
  musicMaxQueue: 10,
  musicBannedUsers: [],
  musicVolume: 0.5,
  streamerPlaylist: [],
  playlistShuffle: false,
  playlistEnabled: false,
  langFilterEnabled: false,
  ttsVoiceLang: 'es-MX',
};

const CONFIG_VALIDATORS = {
  LIKE_DEBOUNCE_MS: (v) => Number.isInteger(v) && v >= 250 && v <= 10000,
  TTS_MAX_CHARS: (v) => Number.isInteger(v) && v >= 20 && v <= 1000,
  rateLimitEnabled: (v) => typeof v === 'boolean',
  TTS_RATE_LIMIT_MAX: (v) => Number.isInteger(v) && v >= 1 && v <= 120,
  TTS_RATE_WINDOW_MS: (v) => Number.isInteger(v) && v >= 1000 && v <= 60000,
  MAX_QUEUE_MSG: (v) => Number.isInteger(v) && v >= 1 && v <= 100,
  musicEnabled: (v) => typeof v === 'boolean',
  musicUserCooldownMs: (v) => Number.isInteger(v) && v >= 0 && v <= 3600000,
  musicMaxQueue: (v) => Number.isInteger(v) && v >= 1 && v <= 50,
  musicBannedUsers: (v) => Array.isArray(v),
  musicVolume: (v) => typeof v === 'number' && v >= 0 && v <= 1,
  streamerPlaylist: (v) => Array.isArray(v),
  playlistShuffle: (v) => typeof v === 'boolean',
  playlistEnabled: (v) => typeof v === 'boolean',
  langFilterEnabled: (v) => typeof v === 'boolean',
  ttsVoiceLang: (v) => GOOGLE_TTS_LANGS.has(v),
};

const config = { ...DEFAULT_CONFIG };

function applyConfigPatch(input = {}) {
  const rejected = [];
  let changed = false;
  for (const [k, v] of Object.entries(input)) {
    if (!(k in CONFIG_VALIDATORS)) continue;
    if (!CONFIG_VALIDATORS[k](v)) {
      rejected.push(k);
      continue;
    }
    if (config[k] !== v) {
      config[k] = v;
      changed = true;
    }
  }
  return { rejected, changed };
}

function saveConfig() {
  try {
    fs.writeFileSync(CONFIG_FILE, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
  } catch (err) {
    log('error', 'config', 'failed to save config', { error: err.message });
  }
}

function loadConfig() {
  try {
    if (!fs.existsSync(CONFIG_FILE)) return;
    const parsed = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    const { rejected } = applyConfigPatch(parsed);
    if (rejected.length) log('warn', 'config', 'ignored invalid persisted config keys', { rejected });
    log('info', 'config', 'loaded persisted config', config);
  } catch (err) {
    log('warn', 'config', 'failed to load persisted config', { error: err.message });
  }
}

loadConfig();

// ── FEATURE FLAGS — set to true to re-enable ─────────────────────────────────
const FEATURES = { musicBot: true };
// ─────────────────────────────────────────────────────────────────────────────

// ── MUSIC BOT STATE ──────────────────────────────────────────────────────────
let musicQueue = [];       // [{ videoId, title, channelName, thumbnail, duration, requestedBy, platform }]
let currentTrack = null;   // currently playing track object (null = idle)
let userLastRequest = {};  // { userId: timestamp } — cooldown tracking (configurable, may be 0/disabled)
const recentMusicCommands = new Map(); // `${userId}::${query}` → timestamp — dedup fijo, independiente del cooldown configurable
const MUSIC_DEDUP_WINDOW_MS = 3000;
let playlistResolved = []; // [{ raw, videoId, title, channelName, thumbnail }] — resolved playlist entries
let playlistIndex = 0;
let playlistActive = false;

function extractYoutubeVideoId(str) {
  const patterns = [
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([A-Za-z0-9_-]{11})/,
    /^([A-Za-z0-9_-]{11})$/,
  ];
  for (const re of patterns) {
    const m = str.match(re);
    if (m) return m[1];
  }
  return null;
}

function extractSpotifyQuery(url) {
  const m = url.match(/spotify\.com\/track\/[A-Za-z0-9]+/);
  if (!m) return null;
  // Extract track name from URL path segment (best-effort; title extraction needs API)
  const parts = url.split('/');
  // The path is /track/<id> – we can't get the title without Spotify API.
  // Return a marker so caller searches by Spotify URL title if possible.
  return parts[parts.length - 1] ? null : null; // no API key → skip Spotify
}

async function resolveYoutubeId(query) {
  // Direct YouTube URL
  const ytId = extractYoutubeVideoId(query);
  if (ytId) return { videoId: ytId };

  // Spotify: strip URL, try to search YouTube by the track name embedded in URL path
  if (/spotify\.com/.test(query)) {
    // Can't resolve without Spotify API — skip
    return null;
  }

  // Text search via yt-dlp
  try {
    return await musicEngine.search(query);
  } catch (err) {
    log('warn', 'music', 'búsqueda falló', { query, error: err.message });
    return null;
  }
}

async function resolveFullTrack(query) {
  const partial = await resolveYoutubeId(query);
  if (!partial) return null;
  if (partial.title) return partial; // already have metadata from search

  // Fetch metadata from yt-dlp if we only have a videoId
  try {
    const info = await musicEngine.getInfo(partial.videoId);
    if (info) return info;
    return { videoId: partial.videoId, title: query, channelName: '', thumbnail: '', duration: '' };
  } catch (err) {
    log('warn', 'music', 'getInfo falló', { videoId: partial.videoId, error: err.message });
    return { videoId: partial.videoId, title: query, channelName: '', thumbnail: '', duration: '' };
  }
}

function formatDuration(secs) {
  if (!secs || isNaN(secs)) return '';
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function musicBroadcastState() {
  mobileState.music = {
    enabled: config.musicEnabled,
    current: currentTrack,
    queueLength: musicQueue.length,
    volume: config.musicVolume,
    playlistEnabled: config.playlistEnabled,
    playlistActive,
    playlistIndex,
    playlistTotal: playlistResolved.length,
  };
  broadcast({ type: 'music-state', ...mobileState.music });
}

async function handleMusicRequest(query, user, userId, platform) {
  log('info', 'music', '!p recibido', { query, user, platform });
  if (!config.musicEnabled) { log('info', 'music', 'deshabilitado'); return; }

  const now = Date.now();

  // Dedup fijo, siempre activo (independiente del cooldown configurable,
  // que el usuario puede dejar en 0): ignora el mismo comando del mismo
  // usuario si llega duplicado (p.ej. replay de reconexión del chat) dentro
  // de una ventana corta.
  const dedupKey = `${userId}::${query.toLowerCase()}`;
  const lastSeen = recentMusicCommands.get(dedupKey);
  if (lastSeen && now - lastSeen < MUSIC_DEDUP_WINDOW_MS) {
    log('info', 'music', 'comando duplicado ignorado', { user, query });
    return;
  }
  recentMusicCommands.set(dedupKey, now);
  if (recentMusicCommands.size > 300) {
    for (const [k, t] of recentMusicCommands) {
      if (now - t > MUSIC_DEDUP_WINDOW_MS) recentMusicCommands.delete(k);
    }
  }

  const bannedList = config.musicBannedUsers.map(u => u.toLowerCase());
  if (bannedList.includes(String(userId || '').toLowerCase()) ||
      bannedList.includes(String(user || '').toLowerCase())) { log('info', 'music', 'usuario baneado', { user }); return; }

  if (config.musicUserCooldownMs > 0 && userLastRequest[userId] &&
      now - userLastRequest[userId] < config.musicUserCooldownMs) { log('info', 'music', 'cooldown activo', { user }); return; }

  if (musicQueue.length >= config.musicMaxQueue) { log('info', 'music', 'cola llena'); return; }

  // Marcar el cooldown ya aquí (antes de los await) para que un evento de
  // chat duplicado llegando mientras esto resuelve sea bloqueado, no
  // procesado dos veces.
  userLastRequest[userId] = now;

  // Asegurar binario yt-dlp (descarga on-demand la primera vez; broadcast de
  // estado via onStatus del engine para que la UI muestre toast)
  try {
    await musicEngine.ensureReady();
  } catch (err) {
    log('warn', 'music', 'motor no disponible', { error: err.message });
    return;
  }

  let track;
  try {
    log('info', 'music', 'resolviendo track', { query });
    track = await resolveFullTrack(query);
    log('info', 'music', 'track resuelto', { track });
  } catch (err) {
    log('warn', 'music', 'resolveFullTrack error', { error: err.message });
    return;
  }
  if (!track) { log('warn', 'music', 'track null para query', { query }); return; }

  track.requestedBy = user;
  track.platform = platform;

  const wasEmpty = musicQueue.length === 0 && !currentTrack;
  musicQueue.push(track);
  broadcast({ type: 'music-queued', track, queue: [...musicQueue], queueLength: musicQueue.length });

  if (wasEmpty) {
    // If playlist was playing, it will finish its current song first (advanceMusicQueue handles priority)
    if (!currentTrack) advanceMusicQueue();
  }
  musicBroadcastState();
}

function advanceMusicQueue() {
  if (musicQueue.length > 0) {
    playlistActive = false;
    currentTrack = musicQueue.shift();
    broadcast({ type: 'music-now-playing', track: currentTrack, queue: [...musicQueue] });
  } else if (config.playlistEnabled && playlistResolved.length > 0) {
    playlistActive = true;
    if (config.playlistShuffle) {
      playlistIndex = Math.floor(Math.random() * playlistResolved.length);
    }
    const entry = playlistResolved[playlistIndex];
    if (!entry) { currentTrack = null; broadcast({ type: 'music-idle' }); musicBroadcastState(); return; }
    // Advance index for next time
    playlistIndex = (playlistIndex + 1) % playlistResolved.length;
    if (entry.videoId) {
      currentTrack = { ...entry, requestedBy: null, platform: 'playlist' };
      broadcast({ type: 'music-now-playing', track: currentTrack });
    } else {
      // Resolve lazily then play
      resolveFullTrack(entry.raw).then(resolved => {
        if (!resolved) { advanceMusicQueue(); return; }
        // Cache resolved entry
        const idx = playlistResolved.indexOf(entry);
        if (idx !== -1) Object.assign(playlistResolved[idx], resolved);
        currentTrack = { ...resolved, requestedBy: null, platform: 'playlist' };
        broadcast({ type: 'music-now-playing', track: currentTrack });
        musicBroadcastState();
      }).catch(() => advanceMusicQueue());
      return;
    }
  } else {
    currentTrack = null;
    broadcast({ type: 'music-idle' });
  }
  musicBroadcastState();
}

async function resolveAndSavePlaylist(lines) {
  config.streamerPlaylist = lines.filter(l => l.trim());
  saveConfig();
  // Pre-resolve what we can quickly (videoId from URLs only, skip slow searches)
  playlistResolved = config.streamerPlaylist.map(raw => {
    const ytId = extractYoutubeVideoId(raw.trim());
    return ytId ? { raw, videoId: ytId, title: raw, channelName: '', thumbnail: '', duration: '' } : { raw, videoId: null };
  });
  // Reset index
  playlistIndex = 0;
  broadcast({ type: 'music-playlist-update', playlist: playlistResolved, index: playlistIndex });
  musicBroadcastState();
}

// Initialize playlist from persisted config
if (config.streamerPlaylist.length > 0) {
  playlistResolved = config.streamerPlaylist.map(raw => {
    const ytId = extractYoutubeVideoId(raw.trim());
    return ytId ? { raw, videoId: ytId, title: raw, channelName: '', thumbnail: '', duration: '' } : { raw, videoId: null };
  });
}
// ─────────────────────────────────────────────────────────────────────────────

const overlayState = {
  followCount: 0,
  // Suma de las bases de followers de TODOS los canales TikTok conectados.
  // Se recomputa desde followerBaseByChannel; nunca se sobrescribe con el
  // valor de un solo canal (multi-canal: estrategia agregada).
  baseFollowerCount: 0,
  followerBaseByChannel: new Map(), // username → base follower count
  topLikers: new Map(),
  sharers: [],
  credits: {
    donors: [],
    followers: [],
    sharers: [],
  },
};
let followerRefreshTimer = null;
function resetOverlayState() {
  overlayState.followCount = 0;
  overlayState.topLikers.clear();
  overlayState.baseFollowerCount = 0;
  overlayState.followerBaseByChannel.clear();
  overlayState.sharers = [];
  overlayState.credits.donors = [];
  overlayState.credits.followers = [];
  overlayState.credits.sharers = [];
}

// Recalcula la suma de bases por canal (eliminando residuos de canales ya
// desconectados) y la difunde si cambió.
function recomputeFollowerBase() {
  for (const ch of overlayState.followerBaseByChannel.keys()) {
    if (!tiktokChannels.has(ch)) overlayState.followerBaseByChannel.delete(ch);
  }
  let sum = 0;
  for (const count of overlayState.followerBaseByChannel.values()) sum += count;
  if (sum !== overlayState.baseFollowerCount) {
    overlayState.baseFollowerCount = sum;
    broadcast({ type: 'follower-base', count: sum });
  }
}

function setFollowerBaseForChannel(channel, count) {
  if (!(typeof count === 'number' && count > 0)) return;
  overlayState.followerBaseByChannel.set(channel, count);
  recomputeFollowerBase();
}

function log(level, ctx, msg, data = null) {
  const entry = { ts: new Date().toISOString(), level, ctx, msg, ...(data && { data }) };
  serverLogs.push(entry);
  if (serverLogs.length > MAX_SERVER_LOGS) serverLogs.shift();
  const fn = level === 'error' ? console.error : console.log;
  fn(JSON.stringify(entry));
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
    // Actualiza la base de cada canal y recomputa la suma agregada
    for (const [username, entry] of tiktokChannels) {
      try {
        const roomInfo = await entry.conn.fetchRoomInfo();
        const newCount = extractFollowerCount(roomInfo);
        if (newCount > 0 && newCount !== overlayState.followerBaseByChannel.get(username)) {
          setFollowerBaseForChannel(username, newCount);
          log('info', 'followers', 'Base follower count refreshed', { channel: username, count: newCount });
        }
      } catch (err) {
        log('warn', 'followers', 'Failed to refresh follower count', { channel: username, error: err.message });
      }
    }
  }, 5 * 60 * 1000);
}

function stopFollowerRefresh() {
  if (followerRefreshTimer) {
    clearInterval(followerRefreshTimer);
    followerRefreshTimer = null;
  }
}

function cleanupAfterLastTikTokChannel() {
  if (tiktokChannels.size === 0) {
    stopFollowerRefresh();
    clearLikePendingTimers();
    broadcast({ type: 'disconnected' });
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

function cleanName(str = '') {
  return str
    .replace(/^@/, '')
    .replace(/[_.\-]+/g, ' ')
    .replace(/[^\p{L}\p{N} ]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isAutoGenerated(name) {
  return /^user\d{4,}$/i.test(name) || /^\d{4,}$/.test(name);
}

function isUnreadable(name) {
  return !/[\p{L}\p{N}]/u.test(name);
}

function cleanTiktokUsername(value = '') {
  return String(value).replace('@', '').trim();
}

function cleanTwitchChannel(value = '') {
  return String(value)
    .replace(/^https?:\/\/(www\.)?twitch\.tv\//i, '')
    .replace(/^[@#]+/, '')
    .split(/[/?#]/)[0]
    .trim()
    .toLowerCase();
}

function parseYoutubeTarget(value = '') {
  const raw = String(value).trim();
  if (!raw) return null;

  const plainTarget = (candidate) => {
    const clean = String(candidate || '').trim();
    if (!clean) return null;
    if (/^UC[a-zA-Z0-9_-]{20,}$/.test(clean)) {
      return { key: clean, opts: { channelId: clean } };
    }
    if (/^@[a-zA-Z0-9_.-]{2,}$/.test(clean)) {
      return { key: clean, opts: { handle: clean } };
    }
    if (/^[a-zA-Z0-9_-]{11}$/.test(clean)) {
      return { key: clean, opts: { liveId: clean } };
    }
    if (/^[a-zA-Z0-9_.-]{2,}$/.test(clean)) {
      return { key: `@${clean}`, opts: { handle: clean } };
    }
    return null;
  };

  try {
    const prefixed = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const url = new URL(prefixed);
    const host = url.hostname.replace(/^www\./, '').toLowerCase();
    if (!['youtube.com', 'm.youtube.com', 'youtu.be'].includes(host)) return plainTarget(raw);

    if (host === 'youtu.be') {
      return plainTarget(decodeURIComponent(url.pathname.split('/').filter(Boolean)[0] || ''));
    }

    const parts = url.pathname.split('/').filter(Boolean);
    if (parts[0] === 'watch' && url.searchParams.get('v')) return plainTarget(url.searchParams.get('v'));
    if (parts[0] === 'live' && parts[1]) return plainTarget(decodeURIComponent(parts[1]));
    if (parts[0] && parts[0].startsWith('@')) return plainTarget(decodeURIComponent(parts[0]));
    if (parts[0] === 'channel' && parts[1]) return plainTarget(decodeURIComponent(parts[1]));
    if (parts[0] === 'c' || parts[0] === 'user') {
      throw new Error('YouTube: usa @handle, URL del live/video o Channel ID UC...; las URLs /c/ y /user/ no son confiables para el chat live.');
    }
    return plainTarget(raw);
  } catch (err) {
    if (err && String(err.message || '').startsWith('YouTube:')) throw err;
    return plainTarget(raw);
  }
}

function normalizeYoutubeInput(value = '') {
  const target = parseYoutubeTarget(value);
  return target ? target.key : '';
}

function resolveDisplayName(nickname, uniqueId) {
  const nick = cleanName(nickname || '');
  if (nick && !isUnreadable(nick) && !isAutoGenerated(nick)) return nick;
  const uid = cleanName(uniqueId || '');
  if (uid && !isUnreadable(uid) && !isAutoGenerated(uid)) return uid;
  // El rechazo de nombres solo-dígitos aplica únicamente si hay alternativa
  // legible. Si la única identidad disponible es numérica (ej. "12345"),
  // mostrarla es mejor que el literal 'USER'. 'user12345' sigue siendo
  // auto-generado y cae aquí solo si tampoco hay número legible.
  if (nick && !isUnreadable(nick) && /^\d+$/.test(nick)) return nick;
  if (uid && !isUnreadable(uid) && /^\d+$/.test(uid)) return uid;
  return 'USER';
}

const DEFAULT_BLOCKED_WORDS_FILE = path.join(RESOURCE_BASE, 'blocked-words.md');
const BLOCKED_WORDS_FILE = path.join(DATA_BASE, 'blocked-words.md');
const blockedWords = new Set();

function loadBlockedWordsFromFile() {
  try {
    if (!fs.existsSync(BLOCKED_WORDS_FILE) && fs.existsSync(DEFAULT_BLOCKED_WORDS_FILE)) {
      fs.copyFileSync(DEFAULT_BLOCKED_WORDS_FILE, BLOCKED_WORDS_FILE);
    }
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

// Normalización previa a moderación: minúsculas + colapso de espacios.
// Decisión: las 3 plataformas (TikTok/Twitch/YouTube) pasan el texto por
// normalizeForModeration ANTES de isSpam, para que una palabra bloqueada
// se filtre de forma idéntica sin importar la plataforma ni el saneo posterior.
function normalizeForModeration(text) {
  return String(text || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

const VOICE_SCRIPT_REGEX = {
  'es-MX': /\p{Script=Latin}/u, 'en': /\p{Script=Latin}/u, 'en-GB': /\p{Script=Latin}/u,
  'pt': /\p{Script=Latin}/u, 'pt-PT': /\p{Script=Latin}/u, 'fr': /\p{Script=Latin}/u,
  'de': /\p{Script=Latin}/u, 'it': /\p{Script=Latin}/u,
  'ru': /\p{Script=Cyrillic}/u,
  'ja': /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u,
  'zh-CN': /\p{Script=Han}/u,
  'ko': /\p{Script=Hangul}/u,
};

function messageMatchesVoiceScript(text, voiceId) {
  const letters = text.match(/\p{L}/gu);
  if (!letters) return true;
  const allowed = VOICE_SCRIPT_REGEX[voiceId] || VOICE_SCRIPT_REGEX['es-MX'];
  return letters.every((ch) => allowed.test(ch));
}

const LEET_MAP = { '0': 'o', '1': 'i', '3': 'e', '4': 'a', '5': 's', '7': 't', '@': 'a', '$': 's' };

function normalizeAggressive(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[01345@$]/g, (c) => LEET_MAP[c])
    .replace(/[^\p{L}\p{N}]/gu, '')
    .replace(/(.)\1+/g, '$1');
}

const DUP_WINDOW_MS = 45000;
const DUP_MAX_HISTORY = 5;
const DUP_MIN_LEN = 4; // mensajes cortos (ok, no, ja) quedan exentos del check
const userRecentMessages = new Map(); // userKey -> [{ norm, ts }]

function isDuplicateRecent(userKey, norm) {
  const now = Date.now();
  let history = userRecentMessages.get(userKey);
  if (!history) { history = []; userRecentMessages.set(userKey, history); }
  while (history.length && history[0].ts < now - DUP_WINDOW_MS) history.shift();
  const isDup = history.some((h) => h.norm === norm);
  history.push({ norm, ts: now });
  if (history.length > DUP_MAX_HISTORY) history.shift();
  return isDup;
}

// Barrido periódico: borra usuarios inactivos para no acumular memoria indefinidamente.
setInterval(() => {
  const cutoff = Date.now() - DUP_WINDOW_MS;
  for (const [key, history] of userRecentMessages) {
    if (!history.length || history[history.length - 1].ts < cutoff) userRecentMessages.delete(key);
  }
}, 5 * 60 * 1000);

function isSpam(comment, userKey) {
  if (comment.length > 300) return true;
  if (/^(.)\1+$/.test(comment.trim())) return true;
  const lower = comment.toLowerCase();
  for (const w of blockedWords) if (lower.includes(w)) return true;
  if (config.langFilterEnabled && !messageMatchesVoiceScript(comment, config.ttsVoiceLang)) return true;
  const norm = normalizeAggressive(comment);
  if (norm.length >= DUP_MIN_LEN && isDuplicateRecent(userKey, norm)) return true;
  return false;
}

const ttsRequestTimes = [];

// Simple in-memory rate limiter for connect endpoints (max N calls per window)
const connectRequestTimes = [];
function isConnectRateLimited() {
  const now = Date.now();
  const CONNECT_WINDOW_MS = 10000; // 10 s
  const CONNECT_MAX = 10;
  while (connectRequestTimes.length && connectRequestTimes[0] < now - CONNECT_WINDOW_MS)
    connectRequestTimes.shift();
  if (connectRequestTimes.length >= CONNECT_MAX) return true;
  connectRequestTimes.push(now);
  return false;
}

// Middleware compartido por los 3 endpoints de conexión
// (/api/connect, /api/platforms/connect, /api/channels/add).
// connectRequestTimes es de módulo → el límite es global entre los 3.
function connectRateLimiter(_req, res, next) {
  if (isConnectRateLimited()) {
    return res.status(429).json({ error: 'Demasiados intentos de conexión. Espera unos segundos.' });
  }
  next();
}

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

// Broadcast current channel list to all clients
function broadcastChannels() {
  broadcast({
    type: 'channels-updated',
    tiktok: Array.from(tiktokChannels.keys()),
    twitch: Array.from(twitchChannels.keys()),
    youtube: Array.from(youtubeChannels.keys()),
  });
}

// Create TikTok connection + attach event handlers (per-channel)
function setupTikTokConnection(cleanUsername) {
  const existing = tiktokChannels.get(cleanUsername);
  if (existing && existing.conn) existing.conn.removeAllListeners();

  const conn = new WebcastPushConnection(cleanUsername, {
    processInitialData: false,
    enableExtendedGiftInfo: false,
    enableWebsocketUpgrade: true,
    requestPollingIntervalMs: 2000,
  });
  tiktokChannels.set(cleanUsername, { conn, attempts: existing?.attempts || 0, timer: null });

  conn.on('chat', (data) => {
    log('debug', 'chat', 'raw', { preview: JSON.stringify(data).substring(0, 100) });
    if (!data.comment || !data.comment.trim()) return;
    const comment = data.comment.trim();
    const user = resolveDisplayName(data.nickname, data.uniqueId);
    if (FEATURES.musicBot && config.musicEnabled && /^!p\s+\S/i.test(comment)) {
      handleMusicRequest(comment.slice(comment.indexOf(' ') + 1).trim(), user, data.uniqueId || user, 'tiktok');
      return;
    }
    if (isSpam(normalizeForModeration(comment), `tiktok:${data.uniqueId || user}`)) return;
    broadcast({
      type: 'chat',
      platform: 'tiktok',
      channel: cleanUsername,
      user,
      comment,
      ttsComment: sanitizeForTTS(comment),
      timestamp: Date.now()
    });
  });

  conn.on('gift', (data) => {
    if (data.giftType === 1 && !data.repeatEnd) return;
    const user = resolveDisplayName(data.nickname, data.uniqueId);
    const repeatCount = data.repeatCount || 1;
    const { usdValue } = computeGiftUsd({
      giftName: data.giftName,
      repeatCount,
      diamondCount: data.diamondCount || 0,
    });
    overlayState.credits.donors.push({ user, giftName: data.giftName, count: repeatCount, ts: Date.now() });
    broadcast({
      type: 'gift',
      user,
      giftName: data.giftName,
      giftId: data.giftId,
      giftPictureUrl: data.giftPictureUrl || null,
      repeatCount,
      usdValue,
      timestamp: Date.now()
    });
  });

  conn.on('like', (data) => {
    const userId = resolveDisplayName(data.nickname, data.uniqueId);
    if (likePendingTimers.has(userId)) {
      clearTimeout(likePendingTimers.get(userId).timer);
    } else {
      likePendingTimers.set(userId, { timer: null, count: 0 });
    }
    const pending = likePendingTimers.get(userId);
    pending.count += (data.likeCount || 1);
    pending.timer = setTimeout(() => {
      // Capturar el count ANTES de borrar la entrada: likes que entren durante
      // la ventana de disparo crean una entrada nueva y no se pierden/duplican.
      const likeCount = pending.count;
      likePendingTimers.delete(userId);
      broadcast({
        type: 'like',
        user: userId,
        likeCount,
        timestamp: Date.now()
      });
      const existing2 = overlayState.topLikers.get(userId) || { user: userId, totalLikes: 0 };
      existing2.totalLikes += likeCount;
      overlayState.topLikers.set(userId, existing2);
    }, config.LIKE_DEBOUNCE_MS);
  });

  conn.on('member', (data) => {
    broadcast({
      type: 'join',
      user: resolveDisplayName(data.nickname, data.uniqueId),
      timestamp: Date.now()
    });
  });

  conn.on('follow', (data) => {
    const user = resolveDisplayName(data.nickname, data.uniqueId);
    overlayState.credits.followers.push({ user, ts: Date.now() });
    broadcast({ type: 'follow', user, timestamp: Date.now() });
    overlayState.followCount += 1;
  });

  conn.on('share', (data) => {
    const user = resolveDisplayName(data.nickname, data.uniqueId);
    overlayState.sharers.push({ user, ts: Date.now() });
    overlayState.credits.sharers.push({ user, ts: Date.now() });
    broadcast({ type: 'share', user, timestamp: Date.now() });
  });

  conn.on('disconnected', () => {
    const entry = tiktokChannels.get(cleanUsername);
    if (!entry) return;
    broadcast({ type: 'channel-disconnected', platform: 'tiktok', channel: cleanUsername });
    if (entry.attempts < MAX_RECONNECT_ATTEMPTS) {
      const delay = Math.min(1000 * Math.pow(2, entry.attempts), 30000);
      entry.attempts++;
      log('warn', 'reconnect', `Intento ${entry.attempts} en ${delay}ms`, { username: cleanUsername });
      broadcast({ type: 'reconnecting', attempt: entry.attempts, delayMs: delay, channel: cleanUsername });
      entry.timer = setTimeout(() => reconnectTiktok(cleanUsername), delay);
    } else {
      tiktokChannels.delete(cleanUsername);
      recomputeFollowerBase();
      broadcastChannels();
      cleanupAfterLastTikTokChannel();
    }
  });

  conn.on('error', (err) => {
    const safeMsg = String(err.message || 'Error de conexión').substring(0, 200);
    broadcast({ type: 'error', message: safeMsg, channel: cleanUsername });
  });
}

async function reconnectTiktok(username) {
  const entry = tiktokChannels.get(username);
  if (!entry) return;
  try {
    setupTikTokConnection(username);
    const refreshed = tiktokChannels.get(username);
    const state = await refreshed.conn.connect();
    setFollowerBaseForChannel(username, extractFollowerCount(state && state.roomInfo));
    refreshed.attempts = 0;
    if (refreshed.timer) { clearTimeout(refreshed.timer); refreshed.timer = null; }
    broadcast({ type: 'connected', username, isFirst: false });
    log('info', 'reconnect', 'Reconexion exitosa', { username });
  } catch (err) {
    const e2 = tiktokChannels.get(username);
    if (!e2) return;
    log('error', 'reconnect', 'Fallo reconexion', { attempt: e2.attempts, error: err.message });
    if (e2.attempts < MAX_RECONNECT_ATTEMPTS) {
      const delay = Math.min(1000 * Math.pow(2, e2.attempts), 30000);
      e2.attempts++;
      broadcast({ type: 'reconnecting', attempt: e2.attempts, delayMs: delay, channel: username });
      e2.timer = setTimeout(() => reconnectTiktok(username), delay);
    } else {
      tiktokChannels.delete(username);
      recomputeFollowerBase();
      broadcastChannels();
      cleanupAfterLastTikTokChannel();
    }
  }
}

// WebSocket connections from browser and mobile
wss.on('connection', (ws) => {
  clients.add(ws);
  log('info', 'ws', 'Browser client connected', { total: clients.size });

  ws.on('message', (raw) => {
    try {
      const msg = JSON.parse(raw);
      if (msg.type === 'state-sync' && msg.state && typeof msg.state === 'object') {
        // Solo el desktop emite state-sync: marca este socket como desktop.
        // mobileState es un ESPEJO del estado real del desktop; solo se
        // actualiza aquí (nunca optimistamente desde /api/mobile/command).
        ws.isDesktop = true;
        if (typeof msg.state.ttsGlobalEnabled === 'boolean') mobileState.ttsGlobalEnabled = msg.state.ttsGlobalEnabled;
        if (typeof msg.state.ttsPaused === 'boolean') mobileState.ttsPaused = msg.state.ttsPaused;
        if (typeof msg.state.streamTimerRunning === 'boolean') mobileState.streamTimerRunning = msg.state.streamTimerRunning;
        if (msg.state.options && typeof msg.state.options === 'object') mobileState.options = { ...mobileState.options, ...msg.state.options };
        if (Array.isArray(msg.state.clips)) mobileState.clips = msg.state.clips;
        // Relay updated state to all clients (mobile picks this up)
        broadcast({ type: 'state-sync', state: { ...mobileState } });
      }
    } catch (_) {}
  });

  ws.on('close', () => {
    clients.delete(ws);
    log('info', 'ws', 'Browser client disconnected', { total: clients.size });
  });
});

// Connect to TikTok Live (adds channel, does not replace others)
app.post('/api/connect', connectRateLimiter, async (req, res) => {
  const { username } = req.body || {};
  if (!username) return res.status(400).json({ error: 'Se requiere el nombre de usuario' });

  try {
    const cleanUsername = await connectTiktokChannel(username);
    res.json({ success: true, username: cleanUsername });
  } catch (err) {
    const cleanUsername = cleanTiktokUsername(username);
    log('error', 'connect', 'TikTok connection failed', { error: err.message });
    res.status(err.statusCode || 500).json({
      error: err.message.includes('LIVE')
        ? `@${cleanUsername} no está en vivo ahora mismo`
        : err.message.includes('not found')
        ? `Usuario @${cleanUsername} no encontrado`
        : `No se pudo conectar: ${err.message}`
    });
  }
});

// Disconnect TikTok — { username } disconnects one channel; no body disconnects all
app.post('/api/disconnect', (req, res) => {
  const { username } = req.body || {};
  if (username) {
    const cleanUsername = cleanTiktokUsername(username);
    const entry = tiktokChannels.get(cleanUsername);
    if (entry) {
      if (entry.timer) clearTimeout(entry.timer);
      entry.conn.removeAllListeners();
      try { entry.conn.disconnect(); } catch (e) {}
      tiktokChannels.delete(cleanUsername);
    }
    recomputeFollowerBase();
    broadcastChannels();
    if (tiktokChannels.size === 0) {
      stopFollowerRefresh();
      clearLikePendingTimers();
      broadcast({ type: 'disconnected' });
    } else {
      broadcast({ type: 'channel-disconnected', platform: 'tiktok', channel: cleanUsername });
    }
  } else {
    stopFollowerRefresh();
    for (const entry of tiktokChannels.values()) {
      if (entry.timer) clearTimeout(entry.timer);
      entry.conn.removeAllListeners();
      try { entry.conn.disconnect(); } catch (e) {}
    }
    tiktokChannels.clear();
    recomputeFollowerBase();
    clearLikePendingTimers();
    broadcast({ type: 'disconnected' });
    broadcastChannels();
  }
  res.json({ success: true });
});

// Text to Speech endpoint
app.post('/api/tts', async (req, res) => {
  const { text, voice = 'es' } = req.body || {};
  if (!text) return res.status(400).json({ error: 'Texto requerido' });
  if (isTTSRateLimited()) {
    return res.status(429).json({ error: 'Rate limit activo', retryAfter: config.TTS_RATE_WINDOW_MS });
  }
  const limitedText = sanitizeForTTS(text.substring(0, config.TTS_MAX_CHARS));
  log('info', 'tts', 'request', { voice, len: limitedText.length });

  // ── Google TTS (online, múltiples idiomas) ─────────────────
  try {
    const lang = GOOGLE_TTS_LANGS.has(voice) ? voice : 'es';
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

// Translation endpoints removed in v1.2.8 (feature eliminated for security/stability)


// Available voices endpoint
app.get('/api/voices', (req, res) => {
  const voices = [];

  // ── Google TTS ──────────────────────────────────────────────
  const googleVoices = [
    // Español
    { id: 'es-MX', name: 'Español (México)', flag: 'MX' },

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
    app: 'tiktok-tts',
    connected: anyTiktokConnected(),
    wsClients: clients.size,
    uptime: Math.floor(process.uptime()),
    memoryMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
    config,
    timestamp: new Date().toISOString()
  });
});

app.get('/api/logs', (req, res) => {
  const limit = Math.max(1, Math.min(parseInt(req.query.limit || '100', 10) || 100, MAX_SERVER_LOGS));
  res.json({ logs: serverLogs.slice(-limit) });
});

// Config dinámico
app.get('/api/config', (req, res) => res.json(config));

app.patch('/api/config', (req, res) => {
  const { rejected, changed } = applyConfigPatch(req.body || {});
  if (rejected.length) {
    return res.status(400).json({ error: 'Config invalida', rejected, config });
  }
  if (changed) saveConfig();
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
  const { content } = req.body || {};
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
  const { word } = req.body || {};
  if (word && typeof word === 'string') blockedWords.add(word.toLowerCase().trim());
  saveBlockedWordsToFile();
  res.json({ words: [...blockedWords] });
});

app.delete('/api/block-word', (req, res) => {
  const { word } = req.body || {};
  if (word) blockedWords.delete(word.toLowerCase().trim());
  saveBlockedWordsToFile();
  res.json({ words: [...blockedWords] });
});

// Overlay stats for initial hydration
app.get('/api/overlay-stats', (req, res) => {
  const topLikers = [...overlayState.topLikers.values()]
    .sort((a, b) => b.totalLikes - a.totalLikes)
    .slice(0, 10);
  res.json({
    followCount: overlayState.followCount,
    baseFollowerCount: overlayState.baseFollowerCount,
    topLikers,
    sharers: overlayState.sharers.slice(-20),
    credits: {
      donors: overlayState.credits.donors.slice(-50),
      followers: overlayState.credits.followers.slice(-50),
      sharers: overlayState.credits.sharers.slice(-50),
    },
  });
});

// Gift file list for overlay name→filename mapping
app.get('/api/gifts-list', (req, res) => {
  const giftsDir = path.join(RESOURCE_BASE, 'gifts');
  try {
    const files = fs.readdirSync(giftsDir).filter(f => f.endsWith('.png'));
    res.json(files);
  } catch (e) { res.json([]); }
});

// Upload custom background image
app.post('/api/upload-bg', (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      const message = err.code === 'LIMIT_FILE_SIZE'
        ? 'La imagen no puede superar 8 MB'
        : err.message || 'Error al subir imagen';
      return res.status(400).json({ error: message });
    }
    if (!req.file) return res.status(400).json({ error: 'No se recibio ninguna imagen' });
    const url = `/uploads/${req.file.filename}`;
    log('info', 'upload-bg', 'Background uploaded', { url, size: req.file.size });
    res.json({ url });
  });
});

app.delete('/api/upload-bg', (req, res) => {
  const { filename } = req.body || {};
  if (!filename || typeof filename !== 'string') {
    return res.status(400).json({ error: 'Se requiere filename' });
  }
  const safeName = path.basename(filename);
  const filePath = path.resolve(UPLOADS_DIR, safeName);
  if (!filePath.startsWith(path.resolve(UPLOADS_DIR))) {
    return res.status(403).json({ error: 'Forbidden' });
  }
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
  const giftsDir = path.join(RESOURCE_BASE, 'gifts');
  try {
    const files = fs.readdirSync(giftsDir).filter(f => f.endsWith('.png'));
    if (files.length === 0) return res.status(500).json({ error: 'No hay imágenes de regalos' });
    const imgFile = files[Math.floor(Math.random() * files.length)];
    const giftKeys = Object.keys(TIKTOK_GIFT_COINS);
    const giftName = giftKeys[Math.floor(Math.random() * giftKeys.length)];
    const testUsers = ['TestUser', 'FanRandom', 'ViewerPro', 'TikToker', 'StreamerFan'];
    const user = testUsers[Math.floor(Math.random() * testUsers.length)] + Math.floor(Math.random() * 99);
    const { usdValue } = computeGiftUsd({ giftName, repeatCount: 1 });
    broadcast({
      type: 'gift',
      user,
      giftName,
      repeatCount: 1,
      usdValue,
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
  overlayState.credits.followers.push({ user, ts: Date.now() });
  broadcast({ type: 'follow', user, timestamp: Date.now() });
  overlayState.followCount += 1;
  log('info', 'test', 'Test follow broadcasted', { user });
  res.json({ success: true, user });
});

app.post('/api/test/share', (req, res) => {
  const testUsers = ['ShareKing', 'ViralFan', 'StreamShare', 'TikToker', 'TopViewer'];
  const user = testUsers[Math.floor(Math.random() * testUsers.length)] + Math.floor(Math.random() * 99);
  overlayState.sharers.push({ user, ts: Date.now() });
  overlayState.credits.sharers.push({ user, ts: Date.now() });
  broadcast({ type: 'share', user, timestamp: Date.now() });
  log('info', 'test', 'Test share broadcasted', { user });
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

// ── AUTH TOKENS & PLATFORM CONFIG ────────────────────────────────────────────
const authTokens = { twitch: null, twitchLogin: null };
const platformConfig = { twitchClientId: '' };

// ── MULTI-PLATFORM CHAT ───────────────────────────────────────────────────────
const twitchChannels = new Map(); // channel → tmi.Client
const youtubeChannels = new Map(); // channelOrId → LiveChat
const twitchReconnectTimers = new Map();
const youtubeReconnectTimers = new Map();
const youtubeSeenIds = new Map(); // channelKey → Set<msgId> (dedup)
let obsWs = null;

function clearReconnectTimer(map, channel) {
  const timer = map.get(channel);
  if (timer) clearTimeout(timer);
  map.delete(channel);
}

function stopYoutubeChat(chat, reason = 'stop') {
  if (!chat) return;
  try { chat.stop(reason); } catch (_) {}
  try { chat.removeAllListeners(); } catch (_) {}
}

async function connectTwitch(channel, token = null, attempt = 0) {
  const tmi = require('tmi.js');
  channel = cleanTwitchChannel(channel);
  if (!channel) throw new Error('Se requiere canal Twitch');
  clearReconnectTimer(twitchReconnectTimers, channel);
  // Disconnect same channel if already connected (re-connect)
  if (twitchChannels.has(channel)) {
    const prev = twitchChannels.get(channel);
    prev._intentionalDisconnect = true;
    try { await prev.disconnect(); } catch (e) {}
    twitchChannels.delete(channel);
  }
  const clientOpts = { channels: [channel] };
  const effectiveToken = token || authTokens.twitch;
  if (effectiveToken && authTokens.twitchLogin) {
    clientOpts.identity = { username: authTokens.twitchLogin, password: `oauth:${effectiveToken}` };
  }
  const client = new tmi.Client(clientOpts);
  client._intentionalDisconnect = false;

  client.on('message', (_ch, tags, message, self) => {
    if (self || !message.trim()) return;
    const twitchUser = cleanName(tags['display-name'] || tags.username || 'Anónimo');
    const twitchUserId = tags['user-id'] || twitchUser;
    if (FEATURES.musicBot && config.musicEnabled && /^!p\s+\S/i.test(message.trim())) {
      handleMusicRequest(message.trim().slice(message.trim().indexOf(' ') + 1).trim(), twitchUser, twitchUserId, 'twitch');
      return;
    }
    if (isSpam(normalizeForModeration(message), `twitch:${twitchUserId}`)) return;
    const emotes = {};
    if (tags.emotes) {
      for (const [emoteId, positions] of Object.entries(tags.emotes)) {
        const range = Array.isArray(positions) ? positions[0] : positions.split('/')[0];
        const [start, end] = String(range || '').split('-').map(Number);
        // Validar rango: índices enteros, acotados al mensaje; saltar emote malformado
        if (!Number.isInteger(start) || !Number.isInteger(end)) {
          log('debug', 'twitch', 'emote range invalido (no numerico)', { emoteId, range });
          continue;
        }
        if (start < 0 || end < start || end >= message.length) {
          log('debug', 'twitch', 'emote range fuera de limites', { emoteId, range, len: message.length });
          continue;
        }
        const name = message.substring(start, end + 1);
        if (name) emotes[name] = { url: `https://static-cdn.jtvnw.net/emoticons/v2/${emoteId}/default/dark/1.0` };
      }
    }
    broadcast({
      type: 'chat',
      platform: 'twitch',
      channel,
      user: twitchUser,
      comment: sanitizeForTTS(message.trim()),
      ttsComment: sanitizeForTTS(message.trim()),
      emotes: Object.keys(emotes).length > 0 ? emotes : undefined,
      timestamp: Date.now(),
    });
  });

  client.on('disconnected', () => {
    broadcast({ type: 'channel-disconnected', platform: 'twitch', channel });
    twitchChannels.delete(channel);
    broadcastChannels();
    if (!client._intentionalDisconnect && attempt < MAX_RECONNECT_ATTEMPTS) {
      const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
      log('warn', 'twitch', 'Reconectando...', { attempt: attempt + 1, delay });
      const timer = setTimeout(() => {
        twitchReconnectTimers.delete(channel);
        connectTwitch(channel, effectiveToken, attempt + 1).catch((err) => {
          log('warn', 'twitch', 'Reconnect failed', { channel, error: err.message });
        });
      }, delay);
      twitchReconnectTimers.set(channel, timer);
    }
  });

  await client.connect();
  twitchChannels.set(channel, client);
  broadcast({ type: 'platform-connected', platform: 'twitch', channel });
  broadcastChannels();
  log('info', 'twitch', 'Twitch conectado', { channel });
}

async function connectYoutube(channelOrId, attempt = 0) {
  const { LiveChat } = require('youtube-chat');
  const target = parseYoutubeTarget(channelOrId);
  if (!target) throw new Error('YouTube: ingresa @handle, URL del live/video o Channel ID UC...');
  clearReconnectTimer(youtubeReconnectTimers, target.key);

  // Disconnect same channel if already connected
  if (youtubeChannels.has(target.key)) {
    stopYoutubeChat(youtubeChannels.get(target.key), 'reconnect');
    youtubeChannels.delete(target.key);
  }
  const liveChat = new LiveChat(target.opts);

  if (!youtubeSeenIds.has(target.key)) youtubeSeenIds.set(target.key, new Set());

  liveChat.on('chat', (item) => {
    // Dedup by YouTube message ID to prevent replays on reconnect
    const msgId = item.id;
    if (msgId) {
      const seen = youtubeSeenIds.get(target.key);
      if (seen.has(msgId)) return;
      seen.add(msgId);
      if (seen.size > 500) {
        const oldest = seen.values().next().value;
        seen.delete(oldest);
      }
    }

    const emotes = {};
    const displayParts = [];
    for (const part of (item.message || [])) {
      if (part.text) {
        displayParts.push(part.text);
      } else {
        const rawName = part.emojiText || part.alt || '';
        const safeName = rawName.replace(/[^a-zA-Z0-9_\-]/g, '_') || 'emoji';
        const url = part.url || '';
        displayParts.push(`:${safeName}:`);
        if (url) emotes[safeName] = { url };
      }
    }
    const displayText = displayParts.join('').trim();
    const ttsText = displayText.replace(/:[\w\-]+:/g, '').trim();
    if (!displayText) return;
    const ytUser = cleanName(item.author?.name || 'Anónimo');
    const ytUserId = item.author?.channelId || ytUser;
    if (FEATURES.musicBot && config.musicEnabled && /^!p\s+\S/i.test(displayText)) {
      handleMusicRequest(displayText.slice(displayText.indexOf(' ') + 1).trim(), ytUser, ytUserId, 'youtube');
      return;
    }
    if (isSpam(normalizeForModeration(ttsText || displayText), `youtube:${ytUserId}`)) return;
    broadcast({
      type: 'chat',
      platform: 'youtube',
      channel: target.key,
      user: ytUser,
      comment: sanitizeForTTS(displayText),
      ttsComment: ttsText ? sanitizeForTTS(ttsText) : undefined,
      emotes: Object.keys(emotes).length > 0 ? emotes : undefined,
      ytMsgId: msgId || undefined,
      timestamp: Date.now(),
    });
  });

  liveChat.on('error', (err) => {
    log('warn', 'youtube', 'YouTube chat error', { error: String(err) });
    const wasActive = youtubeChannels.get(target.key) === liveChat;
    if (wasActive) {
      stopYoutubeChat(liveChat, 'error');
      broadcast({ type: 'channel-disconnected', platform: 'youtube', channel: target.key });
      youtubeChannels.delete(target.key);
      broadcastChannels();
    }
    // Auto-reconnect with backoff (max 5 attempts)
    if (wasActive && attempt < MAX_RECONNECT_ATTEMPTS) {
      const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
      log('warn', 'youtube', 'Reconectando...', { attempt: attempt + 1, delay });
      const timer = setTimeout(() => {
        youtubeReconnectTimers.delete(target.key);
        connectYoutube(target.key, attempt + 1).catch((err) => {
          log('warn', 'youtube', 'Reconnect failed', { channel: target.key, error: err.message });
        });
      }, delay);
      youtubeReconnectTimers.set(target.key, timer);
    }
  });

  const ok = await liveChat.start();
  if (!ok) throw new Error('No se pudo iniciar el chat de YouTube (¿el canal está en vivo?)');
  youtubeChannels.set(target.key, liveChat);
  broadcast({ type: 'platform-connected', platform: 'youtube', channel: target.key });
  broadcastChannels();
  log('info', 'youtube', 'YouTube conectado', { channelOrId: target.key, opts: target.opts });
}

// ── PLATFORM ENDPOINTS ────────────────────────────────────────────────────────
app.get('/api/platforms/status', (_req, res) => {
  res.json({
    twitch: twitchChannels.size > 0,
    youtube: youtubeChannels.size > 0,
    twitchChannels: Array.from(twitchChannels.keys()),
    youtubeChannels: Array.from(youtubeChannels.keys()),
  });
});

app.post('/api/platforms/connect', connectRateLimiter, async (req, res) => {
  const { platform, channel, token } = req.body || {};
  if (!platform || !channel) return res.status(400).json({ error: 'Se requiere platform y channel' });

  try {
    if (platform === 'tiktok') {
      const cleanUsername = await connectTiktokChannel(channel);
      res.json({ success: true, channel: cleanUsername });
    } else if (platform === 'twitch') {
      // Accept full URLs: https://www.twitch.tv/channel → channel
      const twitchChannel = cleanTwitchChannel(channel);
      await connectTwitch(twitchChannel, token || null);
      res.json({ success: true, channel: twitchChannel });
    } else if (platform === 'youtube') {
      // Accept full URLs: https://www.youtube.com/@handle → @handle
      // https://www.youtube.com/watch?v=ID or youtu.be/ID → ID
      let ytInput = normalizeYoutubeInput(channel);
      await connectYoutube(ytInput);
      res.json({ success: true, channel: ytInput });
    } else return res.status(400).json({ error: 'Plataforma no soportada' });
  } catch (err) {
    log('error', platform, 'Error al conectar', { error: err.message });
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

// Disconnect specific platform channel or all channels of a platform
app.post('/api/platforms/disconnect', async (req, res) => {
  const { platform, channel } = req.body || {};
  try {
    if (platform === 'tiktok') {
      if (channel) {
        const cleanUsername = cleanTiktokUsername(channel);
        const entry = tiktokChannels.get(cleanUsername);
        if (entry) {
          if (entry.timer) clearTimeout(entry.timer);
          entry.conn.removeAllListeners();
          try { entry.conn.disconnect(); } catch (e) {}
          tiktokChannels.delete(cleanUsername);
        }
        recomputeFollowerBase();
        if (tiktokChannels.size === 0) cleanupAfterLastTikTokChannel();
        else broadcast({ type: 'channel-disconnected', platform: 'tiktok', channel: cleanUsername });
      } else {
        for (const entry of tiktokChannels.values()) {
          if (entry.timer) clearTimeout(entry.timer);
          entry.conn.removeAllListeners();
          try { entry.conn.disconnect(); } catch (e) {}
        }
        tiktokChannels.clear();
        recomputeFollowerBase();
        cleanupAfterLastTikTokChannel();
      }
    } else if (platform === 'twitch') {
      if (channel) {
        const twitchChannel = cleanTwitchChannel(channel);
        clearReconnectTimer(twitchReconnectTimers, twitchChannel);
        const c = twitchChannels.get(twitchChannel);
        if (c) { c._intentionalDisconnect = true; try { await c.disconnect(); } catch (e) {} twitchChannels.delete(twitchChannel); }
      } else {
        for (const ch of twitchReconnectTimers.keys()) clearReconnectTimer(twitchReconnectTimers, ch);
        for (const c of twitchChannels.values()) { c._intentionalDisconnect = true; try { await c.disconnect(); } catch (e) {} }
        twitchChannels.clear();
      }
      broadcast({ type: 'platform-disconnected', platform: 'twitch', channel: channel ? cleanTwitchChannel(channel) : null });
    } else if (platform === 'youtube') {
      if (channel) {
        const ytChannel = normalizeYoutubeInput(channel);
        clearReconnectTimer(youtubeReconnectTimers, ytChannel);
        const c = youtubeChannels.get(ytChannel);
        if (c) { stopYoutubeChat(c, 'disconnect'); youtubeChannels.delete(ytChannel); }
        youtubeSeenIds.delete(ytChannel);
      } else {
        for (const ch of youtubeReconnectTimers.keys()) clearReconnectTimer(youtubeReconnectTimers, ch);
        for (const c of youtubeChannels.values()) stopYoutubeChat(c, 'disconnect');
        youtubeChannels.clear();
        youtubeSeenIds.clear();
      }
      broadcast({ type: 'platform-disconnected', platform: 'youtube', channel: channel ? normalizeYoutubeInput(channel) : null });
    }
    broadcastChannels();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── MULTI-CHANNEL MANAGEMENT ENDPOINTS ───────────────────────────────────────
app.get('/api/channels', (_req, res) => {
  res.json({
    tiktok: Array.from(tiktokChannels.keys()),
    twitch: Array.from(twitchChannels.keys()),
    youtube: Array.from(youtubeChannels.keys()),
  });
});

async function connectTiktokChannel(channel) {
  const cleanUsername = cleanTiktokUsername(channel);
  if (!cleanUsername) throw new Error('Se requiere canal TikTok');
  if (connectingTiktok.has(cleanUsername)) {
    const err = new Error('Conexión ya en progreso para este canal');
    err.statusCode = 409;
    throw err;
  }
  connectingTiktok.add(cleanUsername);
  // Salvaguarda anti-cuelgue: si connect() no resuelve en 30s, ABORTAR la
  // conexión (disconnect + removeAllListeners + borrar entrada) antes de
  // liberar el flag. Liberar solo el flag dejaría la conexión colgada viva
  // y una segunda petición duplicaría la conexión.
  // El flag connectingTiktok se borra normalmente SOLO en el finally.
  const connectingTimeout = setTimeout(() => {
    if (!connectingTiktok.has(cleanUsername)) return;
    log('warn', 'tiktok', 'connect timeout (30s) — abortando conexión colgada', { channel: cleanUsername });
    const stale = tiktokChannels.get(cleanUsername);
    if (stale) {
      if (stale.timer) clearTimeout(stale.timer);
      stale.conn.removeAllListeners();
      try { stale.conn.disconnect(); } catch (_) {}
      tiktokChannels.delete(cleanUsername);
      recomputeFollowerBase();
    }
    connectingTiktok.delete(cleanUsername);
  }, 30000);
  const prev = tiktokChannels.get(cleanUsername);
  if (prev) {
    if (prev.timer) clearTimeout(prev.timer);
    prev.conn.removeAllListeners();
    try { prev.conn.disconnect(); } catch (e) {}
    tiktokChannels.delete(cleanUsername);
  }
  const isFirstConnection = tiktokChannels.size === 0;
  if (isFirstConnection) resetOverlayState();
  try {
    setupTikTokConnection(cleanUsername);
    const entry = tiktokChannels.get(cleanUsername);
    const state = await entry.conn.connect();
    setFollowerBaseForChannel(cleanUsername, extractFollowerCount(state && state.roomInfo));
    startFollowerRefresh();
    entry.attempts = 0;
    broadcast({ type: 'connected', username: cleanUsername, isFirst: isFirstConnection });
    broadcastChannels();
    return cleanUsername;
  } catch (err) {
    tiktokChannels.delete(cleanUsername);
    recomputeFollowerBase();
    throw err;
  } finally {
    clearTimeout(connectingTimeout);
    connectingTiktok.delete(cleanUsername);
  }
}

app.post('/api/channels/add', connectRateLimiter, async (req, res) => {
  const { platform, channel, token } = req.body || {};
  if (!platform || !channel) return res.status(400).json({ error: 'Se requiere platform y channel' });
  try {
    if (platform === 'tiktok') {
      const cleanUsername = await connectTiktokChannel(channel);
      res.json({ success: true, channel: cleanUsername });
    } else if (platform === 'twitch') {
      const twitchChannel = cleanTwitchChannel(channel);
      await connectTwitch(twitchChannel, token || null);
      res.json({ success: true, channel: twitchChannel });
    } else if (platform === 'youtube') {
      let ytInput = normalizeYoutubeInput(channel);
      await connectYoutube(ytInput);
      res.json({ success: true, channel: ytInput });
    } else {
      res.status(400).json({ error: 'Plataforma no soportada' });
    }
  } catch (err) {
    log('error', platform, 'Error al agregar canal', { error: err.message });
    res.status(err.statusCode || 500).json({ error: err.message });
  }
});

app.post('/api/channels/remove', async (req, res) => {
  const { platform, channel } = req.body || {};
  if (!platform || !channel) return res.status(400).json({ error: 'Se requiere platform y channel' });
  try {
    if (platform === 'tiktok') {
      const cleanUsername = cleanTiktokUsername(channel);
      const entry = tiktokChannels.get(cleanUsername);
      if (entry) {
        if (entry.timer) clearTimeout(entry.timer);
        entry.conn.removeAllListeners();
        try { entry.conn.disconnect(); } catch (e) {}
        tiktokChannels.delete(cleanUsername);
      }
      recomputeFollowerBase();
      if (tiktokChannels.size === 0) cleanupAfterLastTikTokChannel();
      else broadcast({ type: 'channel-disconnected', platform: 'tiktok', channel: cleanUsername });
    } else if (platform === 'twitch') {
      const twitchChannel = cleanTwitchChannel(channel);
      clearReconnectTimer(twitchReconnectTimers, twitchChannel);
      const c = twitchChannels.get(twitchChannel);
      if (c) { c._intentionalDisconnect = true; try { await c.disconnect(); } catch (e) {} twitchChannels.delete(twitchChannel); }
      broadcast({ type: 'channel-disconnected', platform: 'twitch', channel: twitchChannel });
    } else if (platform === 'youtube') {
      const ytChannel = normalizeYoutubeInput(channel);
      clearReconnectTimer(youtubeReconnectTimers, ytChannel);
      const c = youtubeChannels.get(ytChannel);
      if (c) { stopYoutubeChat(c, 'disconnect'); youtubeChannels.delete(ytChannel); }
      youtubeSeenIds.delete(ytChannel);
      broadcast({ type: 'channel-disconnected', platform: 'youtube', channel: ytChannel });
    }
    broadcastChannels();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── OBS WEBSOCKET ─────────────────────────────────────────────────────────────
// Reconexión automática con backoff exponencial (mismo patrón que las
// plataformas de chat): tras una caída no intencional se reintenta con los
// últimos parámetros de conexión exitosa. Un disconnect manual no reintenta.
let obsLastParams = null;        // { port, password } de la última conexión exitosa
let obsReconnectTimer = null;
let obsReconnectAttempts = 0;
let obsIntentionalClose = false;

function clearObsReconnect() {
  if (obsReconnectTimer) { clearTimeout(obsReconnectTimer); obsReconnectTimer = null; }
  obsReconnectAttempts = 0;
}

function connectObs(port, password) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const settle = (fn) => { if (!settled) { settled = true; fn(); } };
    let ws;

    try {
      ws = new WebSocket(`ws://127.0.0.1:${port}`);
    } catch (err) {
      return reject(err);
    }

    const timeoutId = setTimeout(() => {
      settle(() => {
        try { ws.close(); } catch (_) {}
        reject(new Error('Timeout al conectar OBS (5s)'));
      });
    }, 5000);

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString());
        if (msg.op === 0) {
          // Hello — send Identify (op 1)
          const d = { rpcVersion: 1 };
          const authChallenge = msg.d && msg.d.authentication;
          if (authChallenge && password) {
            const secret = crypto.createHash('sha256')
              .update(password + authChallenge.salt).digest('base64');
            d.authentication = crypto.createHash('sha256')
              .update(secret + authChallenge.challenge).digest('base64');
          }
          d.eventSubscriptions = 64; // OutputEvents bitmask — includes StreamStateChanged
          ws.send(JSON.stringify({ op: 1, d }));
        } else if (msg.op === 2) {
          // Identified — connection established
          clearTimeout(timeoutId);
          obsWs = ws;
          obsLastParams = { port, password };
          clearObsReconnect();
          broadcast({ type: 'obs-connected' });
          settle(() => resolve());
        } else if (msg.op === 5) {
          // Event — handle StreamStateChanged to auto-start/stop stream timer
          const { eventType, eventData } = msg.d || {};
          if (eventType === 'StreamStateChanged') {
            if (eventData && eventData.outputState === 'OBS_WEBSOCKET_OUTPUT_STARTED') {
              broadcast({ type: 'obs-stream-started' });
            } else if (eventData && eventData.outputState === 'OBS_WEBSOCKET_OUTPUT_STOPPED') {
              broadcast({ type: 'obs-stream-stopped' });
            }
          }
        }
      } catch (parseErr) {
        console.warn('[obs-ws] parse error on message:', parseErr.message);
      }
    });

    ws.on('error', (err) => {
      clearTimeout(timeoutId);
      settle(() => reject(err));
    });

    ws.on('close', () => {
      clearTimeout(timeoutId);
      if (obsWs === ws) {
        obsWs = null;
        broadcast({ type: 'obs-disconnected' });
        if (!obsIntentionalClose) scheduleObsReconnect();
      }
      settle(() => reject(new Error('OBS cerró la conexión')));
    });
  });
}

function scheduleObsReconnect() {
  if (!obsLastParams || obsReconnectTimer) return;
  if (obsReconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    log('warn', 'obs', 'Reconexion OBS agotada', { attempts: obsReconnectAttempts });
    clearObsReconnect();
    return;
  }
  const delay = Math.min(1000 * Math.pow(2, obsReconnectAttempts), 30000);
  obsReconnectAttempts++;
  broadcast({ type: 'obs-reconnecting', attempt: obsReconnectAttempts, delayMs: delay });
  obsReconnectTimer = setTimeout(async () => {
    obsReconnectTimer = null;
    if (obsIntentionalClose || obsWs) return;
    try {
      await connectObs(obsLastParams.port, obsLastParams.password);
      log('info', 'obs', 'Reconexion OBS exitosa', { attempt: obsReconnectAttempts });
    } catch (err) {
      log('warn', 'obs', 'Fallo reconexion OBS', { attempt: obsReconnectAttempts, error: err.message });
      // El handler de 'close' ya programó el siguiente intento si corresponde;
      // si falló antes de abrir (error de socket), programarlo aquí.
      if (!obsReconnectTimer) scheduleObsReconnect();
    }
  }, delay);
}

app.post('/api/obs/connect', async (req, res) => {
  const { port = 4455, password = '' } = req.body || {};

  obsIntentionalClose = true; // cierre del socket previo (si hay) no debe reintentar
  clearObsReconnect();
  if (obsWs) {
    try { obsWs.close(); } catch (_) {}
    obsWs = null;
  }
  obsIntentionalClose = false;

  try {
    await connectObs(port, password);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/obs/disconnect', (_req, res) => {
  obsIntentionalClose = true;
  clearObsReconnect();
  if (obsWs) {
    try { obsWs.close(); } catch (_) {}
    obsWs = null;
    broadcast({ type: 'obs-disconnected' });
  }
  res.json({ success: true });
});

app.post('/api/obs/save-replay', (_req, res) => {
  if (!obsWs || obsWs.readyState !== WebSocket.OPEN) {
    return res.status(400).json({ error: 'OBS no conectado' });
  }
  try {
    obsWs.send(JSON.stringify({
      op: 6,
      d: { requestType: 'SaveReplayBuffer', requestId: `replay-${Date.now()}` }
    }));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/platform-config', (_req, res) => res.json(platformConfig));

app.patch('/api/platform-config', (req, res) => {
  const allowed = Object.keys(platformConfig);
  for (const [k, v] of Object.entries(req.body || {})) {
    if (allowed.includes(k) && typeof v === 'string') platformConfig[k] = v;
  }
  res.json(platformConfig);
});

app.get('/auth/twitch/callback', (_req, res) => {
  res.send(`<!DOCTYPE html><html><head><title>Twitch Auth</title></head><body>
    <p style="font-family:sans-serif;padding:20px">Autenticando con Twitch...</p>
    <script>
      const hash = new URLSearchParams(location.hash.slice(1));
      const token = hash.get('access_token');
      if (token) {
        fetch('/auth/twitch/token', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ token })
        }).then(() => { document.body.innerHTML = '<p style="font-family:sans-serif;padding:20px;color:green">✓ Twitch conectado. Puedes cerrar esta ventana.</p>'; });
      } else {
        document.body.innerHTML = '<p style="font-family:sans-serif;padding:20px;color:red">Error: no se recibió token. Intenta de nuevo.</p>';
      }
    <\/script>
  </body></html>`);
});

app.post('/auth/twitch/token', async (req, res) => {
  const { token } = req.body || {};
  if (!token) return res.status(400).json({ error: 'Token requerido' });
  if (!platformConfig.twitchClientId) {
    return res.status(400).json({ error: 'Cliente ID de Twitch no configurado. Ve a Configuración > Plataformas.' });
  }
  authTokens.twitch = token;
  // TODO: persist token to config file + add expiry/refresh logic so it survives restarts
  log('info', 'twitch-oauth', 'Token stored in memory (not persisted — lost on restart)');
  try {
    const { fetch: nodeFetch } = require('undici');
    const r = await nodeFetch('https://api.twitch.tv/helix/users', {
      headers: { 'Authorization': `Bearer ${token}`, 'Client-Id': platformConfig.twitchClientId },
    });
    if (!r.ok) {
      authTokens.twitchLogin = null;
      return res.status(401).json({ error: 'Token inválido o Client ID incorrecto' });
    }
    const d = await r.json();
    authTokens.twitchLogin = d.data?.[0]?.login || null;
  } catch (e) {
    authTokens.twitchLogin = null;
    return res.status(502).json({ error: 'Error contactando Twitch', detail: e.message });
  }
  broadcast({ type: 'twitch-auth-ready', login: authTokens.twitchLogin });
  log('info', 'twitch-oauth', 'Token recibido', { login: authTokens.twitchLogin });
  res.json({ success: true, login: authTokens.twitchLogin });
});

// ─── MOBILE REMOTE ROUTES ────────────────────────────────────────────────────

app.get('/mobile', validateMobileRequest, (_req, res) => {
  res.sendFile(path.join(RESOURCE_BASE, 'public', 'mobile.html'));
});

app.get('/api/local-ip', (_req, res) => {
  const ips = getLocalIPCandidates();
  // `ip` se mantiene por compatibilidad (el frontend lo consume); `ips` lista
  // todas las candidatas para entornos multi-interfaz.
  res.json({ ip: ips[0] || '127.0.0.1', ips, port: PORT || 3000 });
});

app.get('/api/mobile/qr', async (_req, res) => {
  const ip = getLocalIP();
  const url = `http://${ip}:${PORT || 3000}/mobile`;
  try {
    const png = await QRCode.toBuffer(url, { width: 280, margin: 2, color: { dark: '#000000', light: '#ffffff' } });
    res.set('Content-Type', 'image/png');
    res.set('Cache-Control', 'no-store');
    res.send(png);
  } catch (e) {
    res.status(500).json({ error: 'QR generation failed' });
  }
});

app.get('/api/mobile/state', validateMobileRequest, (_req, res) => {
  res.json(mobileState);
});

// ── Sound Pad endpoints ────────────────────────────────────────────────────────
const audioStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, SOUNDS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.mp3';
    const name = crypto.randomBytes(8).toString('hex') + ext;
    cb(null, name);
  }
});

const uploadAudio = multer({
  storage: audioStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedExt = ['.mp3', '.wav', '.ogg', '.webm', '.m4a'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExt.includes(ext)) cb(null, true);
    else cb(new Error('Solo se permiten archivos MP3, WAV, OGG, WEBM o M4A'));
  }
});

function syncSoundPadsToMobileState() {
  mobileState.soundPads = loadSounds().map(s => ({ id: s.id, name: s.name, color: s.color }));
  broadcast({ type: 'state-sync', state: { ...mobileState } });
}

app.get('/api/soundpad/list', (req, res) => {
  res.json(loadSounds());
});

app.post('/api/soundpad/upload', validateLocalMutation, uploadAudio.single('audio'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No se recibió archivo de audio' });
  const sounds = loadSounds();
  if (sounds.length >= 24) {
    fs.unlink(req.file.path, () => {});
    return res.status(400).json({ error: 'Máximo 24 sonidos permitidos' });
  }
  const id = crypto.randomBytes(8).toString('hex');
  const baseName = path.basename(req.file.originalname, path.extname(req.file.originalname));
  const entry = {
    id,
    filename: req.file.filename,
    name: baseName.slice(0, 40),
    shortcut: null,
    color: '#3ecf8e',
    createdAt: Date.now(),
  };
  sounds.push(entry);
  saveSounds(sounds);
  syncSoundPadsToMobileState();
  res.json(entry);
});

app.patch('/api/soundpad/:id', validateLocalMutation, (req, res) => {
  const sounds = loadSounds();
  const idx = sounds.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Sonido no encontrado' });
  const { name, color, shortcut } = req.body || {};
  if (typeof name === 'string') sounds[idx].name = name.slice(0, 40);
  if (typeof color === 'string') sounds[idx].color = color;
  if (shortcut !== undefined) sounds[idx].shortcut = shortcut || null;
  saveSounds(sounds);
  syncSoundPadsToMobileState();
  res.json(sounds[idx]);
});

app.delete('/api/soundpad/:id', validateLocalMutation, (req, res) => {
  const sounds = loadSounds();
  const idx = sounds.findIndex(s => s.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Sonido no encontrado' });
  const [removed] = sounds.splice(idx, 1);
  try { fs.unlinkSync(path.join(SOUNDS_DIR, removed.filename)); } catch (_) {}
  saveSounds(sounds);
  syncSoundPadsToMobileState();
  res.json({ ok: true });
});

const MOBILE_ALLOWED_ACTIONS = new Set([
  'toggle', 'globalTTS', 'pause', 'skip', 'clear', 'emergency', 'markClip', 'deleteClip', 'soloChat',
  'soundpadPlay',
  'musicSkip', 'musicToggle', 'musicVolume', 'playlistToggle',
]);

function hasDesktopClient() {
  for (const c of clients) {
    if (c.isDesktop && c.readyState === 1) return true;
  }
  return false;
}

app.post('/api/mobile/command', validateMobileRequest, (req, res) => {
  const { action, key, value, index, clipId, soundId } = req.body || {};
  if (!action || !MOBILE_ALLOWED_ACTIONS.has(action)) {
    return res.status(400).json({ error: 'Acción no válida' });
  }

  // Music actions are handled server-side directly — no desktop relay needed
  if (action === 'musicSkip') {
    currentTrack = null;
    // music-skip solo detiene el audio local en los clientes; el avance de la
    // cola ocurre aquí, una sola vez, sin importar cuántos clientes escuchan
    broadcast({ type: 'music-skip' });
    advanceMusicQueue();
    return res.json({ ok: true });
  }
  if (action === 'musicToggle') {
    config.musicEnabled = !config.musicEnabled;
    saveConfig();
    musicBroadcastState();
    return res.json({ ok: true, musicEnabled: config.musicEnabled });
  }
  if (action === 'musicVolume' && typeof value === 'number') {
    config.musicVolume = Math.max(0, Math.min(1, value));
    saveConfig();
    broadcast({ type: 'music-volume', volume: config.musicVolume });
    musicBroadcastState();
    return res.json({ ok: true });
  }
  if (action === 'playlistToggle') {
    setPlaylistEnabled(!config.playlistEnabled);
    return res.json({ ok: true, playlistEnabled: config.playlistEnabled });
  }

  // El desktop es la única fuente de verdad del estado TTS: este endpoint
  // solo reenvía el comando. mobileState se actualiza cuando el desktop
  // confirma vía state-sync. Sin desktop conectado no hay nada que ejecute
  // el comando: avisar al móvil en vez de fingir éxito.
  if (!hasDesktopClient()) {
    return res.json({ ok: false, reason: 'desktop-offline' });
  }

  broadcast({ type: 'remote-cmd', action, key, value, index, clipId, soundId });
  res.json({ ok: true });
});

// ── MUSIC API ROUTES ─────────────────────────────────────────────────────────

app.get('/api/music/stream', async (req, res) => {
  const { videoId } = req.query;
  if (!videoId || !/^[A-Za-z0-9_-]{11}$/.test(videoId)) {
    return res.status(400).json({ error: 'videoId inválido' });
  }
  log('info', 'music', 'stream solicitado', { videoId });
  res.setHeader('Cache-Control', 'no-store');
  try {
    // Cubre el caso playlist-con-URL-directa donde el stream es el primer uso
    await musicEngine.ensureReady();
  } catch (err) {
    return res.status(503).json({ error: 'Motor de música no disponible' });
  }
  // Caso dominante es webm/opus; Chromium sniffa el contenido real, así que
  // el fallback m4a también reproduce aunque el mime no coincida.
  res.setHeader('Content-Type', 'audio/webm');
  const child = musicEngine.createStream(videoId);
  // end:false — si yt-dlp falla sin emitir bytes, el pipe no cierra la
  // respuesta con 200 vacío antes de que podamos responder 500 (el 500
  // preserva el auto-skip del cliente via Audio.onerror)
  child.stdout.pipe(res, { end: false });
  let aborted = false;
  child.on('error', (err) => {
    log('warn', 'music', 'stream spawn error', { videoId, error: err.message });
    if (!res.headersSent) res.status(500).end();
    else res.end();
  });
  child.on('close', (code) => {
    // Si el cliente abortó (skip/cierre), el kill produce exit≠0: no es error
    if (code !== 0 && !aborted) {
      log('warn', 'music', 'stream error', { videoId, code, error: child.stderrTail() });
      if (!res.headersSent) return res.status(500).end();
    }
    res.end();
  });
  res.on('close', () => {
    if (!res.writableEnded) aborted = true;
    try { child.kill(); } catch (_) {}
  });
});

app.get('/api/music/engine', (_req, res) => {
  res.json(musicEngine.getStatus());
});

app.get('/api/music/queue', (_req, res) => {
  res.json({ current: currentTrack, queue: musicQueue, playlistActive });
});

app.post('/api/music/skip', (req, res) => {
  currentTrack = null;
  // music-skip solo detiene el audio local; el avance de la cola es server-side
  broadcast({ type: 'music-skip' });
  advanceMusicQueue();
  res.json({ ok: true });
});

app.post('/api/music/next', (_req, res) => {
  advanceMusicQueue();
  res.json({ ok: true, current: currentTrack });
});

app.get('/api/music/config', (_req, res) => {
  res.json({
    musicEnabled: config.musicEnabled,
    musicUserCooldownMs: config.musicUserCooldownMs,
    musicMaxQueue: config.musicMaxQueue,
    musicBannedUsers: config.musicBannedUsers,
    musicVolume: config.musicVolume,
    playlistEnabled: config.playlistEnabled,
    playlistShuffle: config.playlistShuffle,
  });
});

app.patch('/api/music/config', (req, res) => {
  const allowed = ['musicEnabled', 'musicUserCooldownMs', 'musicMaxQueue', 'musicBannedUsers',
    'musicVolume', 'playlistEnabled', 'playlistShuffle'];
  const patch = {};
  for (const k of allowed) {
    if (k in req.body) patch[k] = req.body[k];
  }
  const { rejected } = applyConfigPatch(patch);
  if (rejected.length) return res.status(400).json({ error: 'Valores inválidos', rejected });
  saveConfig();
  if ('playlistEnabled' in patch && config.playlistEnabled && !currentTrack) advanceMusicQueue();
  musicBroadcastState();
  res.json({ ok: true });
});

app.post('/api/music/ban', (req, res) => {
  const { username } = req.body || {};
  if (!username || typeof username !== 'string') return res.status(400).json({ error: 'username requerido' });
  const clean = username.trim().toLowerCase();
  if (!config.musicBannedUsers.includes(clean)) {
    config.musicBannedUsers.push(clean);
    saveConfig();
  }
  res.json({ ok: true, banned: config.musicBannedUsers });
});

app.post('/api/music/unban', (req, res) => {
  const { username } = req.body || {};
  if (!username || typeof username !== 'string') return res.status(400).json({ error: 'username requerido' });
  const clean = username.trim().toLowerCase();
  config.musicBannedUsers = config.musicBannedUsers.filter(u => u !== clean);
  saveConfig();
  res.json({ ok: true, banned: config.musicBannedUsers });
});

app.get('/api/music/playlist', (_req, res) => {
  res.json({
    playlist: playlistResolved,
    raw: config.streamerPlaylist,
    index: playlistIndex,
    shuffle: config.playlistShuffle,
    enabled: config.playlistEnabled,
  });
});

app.put('/api/music/playlist', async (req, res) => {
  const { lines } = req.body || {};
  if (!Array.isArray(lines)) return res.status(400).json({ error: 'lines debe ser array' });
  await resolveAndSavePlaylist(lines);
  res.json({ ok: true, count: playlistResolved.length });
});

function setPlaylistEnabled(enabled) {
  config.playlistEnabled = enabled;
  saveConfig();
  if (enabled) {
    // Arrancar de fondo solo si no hay nada sonando (las peticiones del chat
    // tienen prioridad; la playlist entra cuando la cola queda vacía)
    if (!currentTrack) advanceMusicQueue();
  } else if (playlistActive) {
    // Cortar la canción de playlist en curso: music-skip detiene el audio en
    // los clientes y advanceMusicQueue pasa a la cola del chat o queda idle
    currentTrack = null;
    playlistActive = false;
    broadcast({ type: 'music-skip' });
    advanceMusicQueue();
  }
  musicBroadcastState();
}

app.post('/api/music/playlist/toggle', (req, res) => {
  // Con { enabled } en el body el estado es explícito (checkbox de la UI);
  // sin body invierte (retrocompat con clientes que solo hacen flip)
  const explicit = req.body && typeof req.body.enabled === 'boolean';
  setPlaylistEnabled(explicit ? req.body.enabled : !config.playlistEnabled);
  res.json({ ok: true, enabled: config.playlistEnabled });
});

app.post('/api/music/playlist/shuffle', (_req, res) => {
  config.playlistShuffle = !config.playlistShuffle;
  saveConfig();
  musicBroadcastState();
  res.json({ ok: true, shuffle: config.playlistShuffle });
});

// ─────────────────────────────────────────────────────────────────────────────

// Cargar palabras bloqueadas al iniciar
loadBlockedWordsFromFile();

// Warm-up del motor de música: descarga el binario si falta y chequea updates
// (throttled a 1 vez/24h) para que la primera !p no pague la espera.
if (FEATURES.musicBot) {
  musicEngine.ensureReady()
    .then(() => musicEngine.checkForUpdates())
    .catch(() => {}); // ya logueado en el engine; se reintenta en la próxima !p
}

// Inicializar soundPads en mobileState con lo que haya guardado
mobileState.soundPads = loadSounds().map(s => ({ id: s.id, name: s.name, color: s.color }));

// Error-handler de Express (4 args): debe ir al FINAL, después de todas las
// rutas, para capturar tanto errores de body-parser (JSON inválido) como
// errores lanzados dentro de las rutas (responde JSON, no stack HTML).
app.use((err, _req, res, next) => {
  if (!err) return next();
  if (res.headersSent) return next(err);
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON invalido' });
  return res.status(400).json({ error: err.message || 'Solicitud invalida' });
});

const PORT = process.env.PORT || 3000;

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[server] Port ${PORT} already in use. Is another instance running?`);
  } else {
    console.error('[server] listen error:', err);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  const localIP = getLocalIP();
  console.log(`\nTikTok Live TTS corriendo en http://127.0.0.1:${PORT}`);
  console.log(`Control mobile: http://${localIP}:${PORT}/mobile\n`);
  // Electron opens the BrowserWindow after detecting this port is up.
});

module.exports.shutdown = function shutdownServer() {
  for (const entry of tiktokChannels.values()) {
    if (entry.timer) clearTimeout(entry.timer);
    entry.conn.removeAllListeners();
    try { entry.conn.disconnect(); } catch (_) {}
  }
  tiktokChannels.clear();

  for (const client of twitchChannels.values()) {
    client._intentionalDisconnect = true;
    try { client.disconnect(); } catch (_) {}
  }
  twitchChannels.clear();
  for (const ch of twitchReconnectTimers.keys()) clearReconnectTimer(twitchReconnectTimers, ch);

  for (const chat of youtubeChannels.values()) {
    stopYoutubeChat(chat, 'shutdown');
  }
  youtubeChannels.clear();
  for (const ch of youtubeReconnectTimers.keys()) clearReconnectTimer(youtubeReconnectTimers, ch);

  obsIntentionalClose = true;
  clearObsReconnect();
  if (obsWs) {
    try { obsWs.close(); } catch (_) {}
    obsWs = null;
  }

  stopFollowerRefresh();
  try { musicEngine.shutdown(); } catch (_) {}
  try { wss.close(); } catch (_) {}
  try { server.close(); } catch (_) {}
};
