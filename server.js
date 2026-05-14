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
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');

const IS_PKG = typeof process.pkg !== 'undefined';
const REAL_BASE = IS_PKG
  ? path.dirname(process.execPath)
  : process.env.TIKTOK_RESOURCES_PATH || __dirname;

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// Uploads directory for custom overlay backgrounds
const UPLOADS_DIR = path.join(REAL_BASE, 'public', 'uploads');
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

app.use(express.static(path.join(REAL_BASE, 'public')));
app.use('/gifts', express.static(path.join(REAL_BASE, 'gifts')));
app.use('/uploads', express.static(UPLOADS_DIR));
app.use(express.json());

let tiktokConnection = null;
let currentUsername = null;
let reconnectAttempts = 0;
let reconnectTimer = null;
let isConnecting = false;
const MAX_RECONNECT_ATTEMPTS = 5;

// TikTok gift prices in coins (what the viewer pays). $1 ≈ 100 coins (~$0.0134/coin).
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

const TIKTOK_COINS_USD = 0.0103; // 100 coins = $1.03 USD

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
  overlayState.sharers = [];
  overlayState.credits.donors = [];
  overlayState.credits.followers = [];
  overlayState.credits.sharers = [];
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

function resolveDisplayName(nickname, uniqueId) {
  const nick = cleanName(nickname || '');
  if (nick && !isUnreadable(nick) && !isAutoGenerated(nick)) return nick;
  const uid = cleanName(uniqueId || '');
  if (uid && !isUnreadable(uid) && !isAutoGenerated(uid)) return uid;
  return 'USER';
}

const BLOCKED_WORDS_FILE = path.join(REAL_BASE, 'blocked-words.md');
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
      platform: 'tiktok',
      user: resolveDisplayName(data.nickname, data.uniqueId),
      comment: data.comment.trim(),
      ttsComment: sanitizeForTTS(data.comment.trim()),
      timestamp: Date.now()
    });
  });

  tiktokConnection.on('gift', (data) => {
    if (data.giftType === 1 && !data.repeatEnd) return;
    const user = resolveDisplayName(data.nickname, data.uniqueId);
    const repeatCount = data.repeatCount || 1;
    const lookedUpCoins = TIKTOK_GIFT_COINS[data.giftName];
    const perGiftCoins  = lookedUpCoins != null ? lookedUpCoins : (data.diamondCount ? data.diamondCount * 2 : 0);
    const totalCoins    = perGiftCoins * repeatCount;
    const usdRaw        = totalCoins * TIKTOK_COINS_USD;
    const usdValue      = usdRaw > 0 ? usdRaw.toFixed(2) : null;
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

  tiktokConnection.on('like', (data) => {
    const userId = resolveDisplayName(data.nickname, data.uniqueId);

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
      user: resolveDisplayName(data.nickname, data.uniqueId),
      timestamp: Date.now()
    });
  });

  tiktokConnection.on('follow', (data) => {
    const user = resolveDisplayName(data.nickname, data.uniqueId);
    overlayState.credits.followers.push({ user, ts: Date.now() });
    broadcast({
      type: 'follow',
      user,
      timestamp: Date.now()
    });
    overlayState.followCount += 1;
  });

  tiktokConnection.on('share', (data) => {
    const user = resolveDisplayName(data.nickname, data.uniqueId);
    overlayState.sharers.push({ user, ts: Date.now() });
    overlayState.credits.sharers.push({ user, ts: Date.now() });
    broadcast({ type: 'share', user, timestamp: Date.now() });
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

// Translation endpoint
app.post('/api/translate', async (req, res) => {
  const { text, targetLang = 'es' } = req.body;
  if (!text) return res.status(400).json({ error: 'text required' });
  try {
    const { translate } = require('@vitalets/google-translate-api');
    const result = await translate(text.substring(0, 500), { to: targetLang });
    res.json({ translated: result.text, detectedLang: result.raw?.src || 'und' });
  } catch (err) {
    log('error', 'translate', 'Translation failed', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

// Edge TTS endpoint (Microsoft Neural voices)
app.post('/api/tts/edge', async (req, res) => {
  const { text, voice = 'es-ES-AlvaroNeural' } = req.body;
  if (!text) return res.status(400).json({ error: 'Texto requerido' });
  if (isTTSRateLimited()) {
    return res.status(429).json({ error: 'Rate limit activo', retryAfter: config.TTS_RATE_WINDOW_MS });
  }
  const limitedText = sanitizeForTTS(text.substring(0, config.TTS_MAX_CHARS));
  log('info', 'tts', 'edge request', { voice, len: limitedText.length });

  try {
    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const readable = tts.toStream(limitedText);

    let bytesSent = 0;
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        res.status(504).json({ error: 'Edge TTS timeout — sin respuesta de Microsoft' });
      }
      try { readable.destroy(); } catch (_) {}
    }, 10000);

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-cache');
    res.flushHeaders();

    readable.on('data', (chunk) => { bytesSent += chunk.length; });
    readable.on('end', () => clearTimeout(timeout));
    readable.on('error', (err) => {
      clearTimeout(timeout);
      log('error', 'tts', 'Edge TTS stream error', { error: err.message });
      res.end();
    });
    readable.pipe(res);
  } catch (err) {
    log('error', 'tts', 'Edge TTS failed', { error: err.message });
    if (!res.headersSent) res.status(500).json({ error: err.message });
  }
});

// Available voices endpoint
app.get('/api/voices', (req, res) => {
  const voices = [];

  // ── Edge TTS (Microsoft Neural) — Español ──────────────────
  const edgeVoicesEs = [
    { id: 'edge-es-ES-AlvaroNeural',  name: 'Álvaro — Edge TTS (España)',  flag: 'ES', engine: 'edge' },
    { id: 'edge-es-MX-JorgeNeural',   name: 'Jorge — Edge TTS (México)',   flag: 'MX', engine: 'edge' },
    { id: 'edge-es-MX-DaliaNeural',   name: 'Dalia — Edge TTS (México)',   flag: 'MX', engine: 'edge' },
    { id: 'edge-es-AR-ElenaNeural',   name: 'Elena — Edge TTS (Argentina)', flag: 'AR', engine: 'edge' },
  ];

  // ── Google TTS ──────────────────────────────────────────────
  const googleVoices = [
    // Español
    { id: 'es', name: 'Español — Google', flag: 'ES' },

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

  voices.push(...edgeVoicesEs, ...googleVoices);
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
  const giftsDir = path.join(REAL_BASE, 'gifts');
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
  const giftsDir = path.join(REAL_BASE, 'gifts');
  try {
    const files = fs.readdirSync(giftsDir).filter(f => f.endsWith('.png'));
    if (files.length === 0) return res.status(500).json({ error: 'No hay imágenes de regalos' });
    const file = files[Math.floor(Math.random() * files.length)];
    const match = file.match(/^\d+_(.+)\.png$/i);
    const giftName = match ? match[1].replace(/_/g, ' ') : 'Regalo';
    const testUsers = ['TestUser', 'FanRandom', 'ViewerPro', 'TikToker', 'StreamerFan'];
    const user = testUsers[Math.floor(Math.random() * testUsers.length)] + Math.floor(Math.random() * 99);
    const lookedUpCoins = TIKTOK_GIFT_COINS[giftName];
    const perGiftCoins  = lookedUpCoins != null ? lookedUpCoins : 10;
    const usdRaw        = perGiftCoins * TIKTOK_COINS_USD;
    const usdValue      = usdRaw > 0 ? usdRaw.toFixed(2) : null;
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
const platformConnections = { twitch: null, youtube: null };
let obsWs = null;

async function connectTwitch(channel, token = null) {
  const tmi = require('tmi.js');
  if (platformConnections.twitch) {
    try { await platformConnections.twitch.disconnect(); } catch (e) {}
    platformConnections.twitch = null;
  }
  const clientOpts = { channels: [channel] };
  if (token && authTokens.twitchLogin) {
    clientOpts.identity = { username: authTokens.twitchLogin, password: `oauth:${token}` };
  }
  const client = new tmi.Client(clientOpts);

  client.on('message', (_ch, tags, message, self) => {
    if (self || !message.trim()) return;
    if (isSpam(message.trim())) return;
    // Parse Twitch emotes for visual rendering
    const emotes = {};
    if (tags.emotes) {
      for (const [emoteId, positions] of Object.entries(tags.emotes)) {
        const range = Array.isArray(positions) ? positions[0] : positions.split('/')[0];
        const [start, end] = range.split('-').map(Number);
        const name = message.substring(start, end + 1);
        if (name) emotes[name] = { url: `https://static-cdn.jtvnw.net/emoticons/v2/${emoteId}/default/dark/1.0` };
      }
    }
    broadcast({
      type: 'chat',
      platform: 'twitch',
      user: cleanName(tags['display-name'] || tags.username || 'Anónimo'),
      comment: sanitizeForTTS(message.trim()),
      emotes: Object.keys(emotes).length > 0 ? emotes : undefined,
      timestamp: Date.now(),
    });
  });

  client.on('disconnected', () => broadcast({ type: 'platform-disconnected', platform: 'twitch' }));

  await client.connect();
  platformConnections.twitch = client;
  broadcast({ type: 'platform-connected', platform: 'twitch' });
  log('info', 'twitch', 'Twitch conectado', { channel });
}

async function connectYoutube(channelOrId) {
  const { LiveChat } = require('youtube-chat');
  if (platformConnections.youtube) {
    try { platformConnections.youtube.stop(); } catch (e) {}
    platformConnections.youtube = null;
  }
  const opts = channelOrId.startsWith('@') ? { handle: channelOrId } : { liveId: channelOrId };
  const liveChat = new LiveChat(opts);

  liveChat.on('chat', (item) => {
    // Parse YouTube emoji/sticker runs for visual rendering
    const emotes = {};
    const displayParts = [];
    for (const part of (item.message || [])) {
      if (part.text) {
        displayParts.push(part.text);
      } else if (part.emoji) {
        const rawName = part.emoji.emojiId || part.emoji.shortcuts?.[0] || '';
        const safeName = rawName.replace(/[^a-zA-Z0-9_\-]/g, '_') || 'emoji';
        const thumbs = part.emoji.image?.thumbnails || [];
        const url = thumbs[thumbs.length - 1]?.url || '';
        displayParts.push(`:${safeName}:`);
        if (url) emotes[safeName] = { url };
      }
    }
    const displayText = displayParts.join('').trim();
    const ttsText = displayText.replace(/:[\w\-]+:/g, '').trim();
    if (!displayText || isSpam(ttsText || displayText)) return;
    broadcast({
      type: 'chat',
      platform: 'youtube',
      user: cleanName(item.author?.name || 'Anónimo'),
      comment: sanitizeForTTS(displayText),
      ttsComment: ttsText ? sanitizeForTTS(ttsText) : undefined,
      emotes: Object.keys(emotes).length > 0 ? emotes : undefined,
      timestamp: Date.now(),
    });
  });

  liveChat.on('error', (err) => {
    log('warn', 'youtube', 'YouTube chat error', { error: String(err) });
    broadcast({ type: 'platform-disconnected', platform: 'youtube' });
  });

  const ok = await liveChat.start();
  if (!ok) throw new Error('No se pudo iniciar el chat de YouTube (¿el canal está en vivo?)');
  platformConnections.youtube = liveChat;
  broadcast({ type: 'platform-connected', platform: 'youtube' });
  log('info', 'youtube', 'YouTube conectado', { channelOrId });
}

// ── PLATFORM ENDPOINTS ────────────────────────────────────────────────────────
app.get('/api/platforms/status', (_req, res) => {
  res.json({
    twitch: !!platformConnections.twitch,
    youtube: !!platformConnections.youtube,
  });
});

app.post('/api/platforms/connect', async (req, res) => {
  const { platform, channel, token } = req.body;
  if (!platform || !channel) return res.status(400).json({ error: 'Se requiere platform y channel' });

  try {
    if (platform === 'twitch') {
      // Accept full URLs: https://www.twitch.tv/channel → channel
      const twitchChannel = channel.replace(/^https?:\/\/(www\.)?twitch\.tv\//i, '').replace('#', '').trim();
      await connectTwitch(twitchChannel, token || null);
    } else if (platform === 'youtube') {
      // Accept full URLs: https://www.youtube.com/@handle → @handle
      // https://www.youtube.com/watch?v=ID or youtu.be/ID → ID
      let ytInput = channel.trim();
      const ytWatchMatch = ytInput.match(/[?&]v=([^&]+)/);
      const ytShortMatch = ytInput.match(/youtu\.be\/([^?]+)/);
      const ytHandleMatch = ytInput.match(/youtube\.com\/@?([\w.-]+)/i);
      if (ytWatchMatch) ytInput = ytWatchMatch[1];
      else if (ytShortMatch) ytInput = ytShortMatch[1];
      else if (ytHandleMatch) ytInput = '@' + ytHandleMatch[1];
      await connectYoutube(ytInput);
    } else return res.status(400).json({ error: 'Plataforma no soportada' });
    res.json({ success: true });
  } catch (err) {
    log('error', platform, 'Error al conectar', { error: err.message });
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/platforms/disconnect', async (req, res) => {
  const { platform } = req.body;
  try {
    if (platform === 'twitch' && platformConnections.twitch) {
      await platformConnections.twitch.disconnect();
      platformConnections.twitch = null;
      broadcast({ type: 'platform-disconnected', platform: 'twitch' });
    } else if (platform === 'youtube' && platformConnections.youtube) {
      platformConnections.youtube.stop();
      platformConnections.youtube = null;
      broadcast({ type: 'platform-disconnected', platform: 'youtube' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── OBS WEBSOCKET ─────────────────────────────────────────────────────────────
app.post('/api/obs/connect', (req, res) => {
  const { port = 4455, password = '' } = req.body || {};

  if (obsWs) {
    try { obsWs.close(); } catch (_) {}
    obsWs = null;
  }

  let settled = false;
  const settle = (fn) => { if (!settled) { settled = true; fn(); } };
  let ws;

  try {
    ws = new WebSocket(`ws://127.0.0.1:${port}`);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  const timeoutId = setTimeout(() => {
    settle(() => {
      try { ws.close(); } catch (_) {}
      res.status(500).json({ error: 'Timeout al conectar OBS (5s)' });
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
        broadcast({ type: 'obs-connected' });
        settle(() => res.json({ success: true }));
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
    } catch (_) {}
  });

  ws.on('error', (err) => {
    clearTimeout(timeoutId);
    settle(() => res.status(500).json({ error: err.message }));
  });

  ws.on('close', () => {
    clearTimeout(timeoutId);
    if (obsWs === ws) {
      obsWs = null;
      broadcast({ type: 'obs-disconnected' });
    }
    settle(() => res.status(500).json({ error: 'OBS cerró la conexión' }));
  });
});

app.post('/api/obs/disconnect', (_req, res) => {
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
  for (const [k, v] of Object.entries(req.body)) {
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
  const { token } = req.body;
  if (!token) return res.status(400).json({ error: 'Token requerido' });
  if (!platformConfig.twitchClientId) {
    return res.status(400).json({ error: 'Cliente ID de Twitch no configurado. Ve a Configuración > Plataformas.' });
  }
  authTokens.twitch = token;
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

// Cargar palabras bloqueadas al iniciar
loadBlockedWordsFromFile();

const PORT = process.env.PORT || 3000;

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    require('child_process').exec(`start http://localhost:${PORT}`);
    process.exit(0);
  }
});

server.listen(PORT, () => {
  console.log(`\nTikTok Live TTS corriendo en http://localhost:${PORT}\n`);
  if (IS_PKG) {
    require('child_process').exec(`start http://localhost:${PORT}`);
    const { initTray } = require('./tray');
    initTray(PORT);
  }
  // In Electron mode, main.js opens the BrowserWindow after detecting this port is up
});
