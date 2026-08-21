'use strict';

// Registro persistente de espectadores + moderación por usuario.
//
// Único sitio del repo que toca `moderation.json`. No sabe de Express ni de
// WebSocket: recibe eventos, guarda estado y responde consultas. Mismo patrón
// de factory con inyección que `music-engine.js`.
//
// Dos ejes ortogonales de castigo:
//   mute → el mensaje se muestra en el chat pero el TTS no lo lee
//   ban  → el mensaje ni siquiera se emite (no llega al chat ni al TTS)
// Valores: 0 = sin castigo · -1 = indefinido · epoch ms = expira en esa fecha.
//
// La expiración se resuelve de forma perezosa (comparando contra Date.now() en
// cada lectura), nunca con un setTimeout por usuario: así sobrevive a que la
// app esté cerrada o el equipo suspendido cuando toca expirar.

const fs = require('fs');
const path = require('path');

const SCHEMA_VERSION = 1;
const FILE_NAME = 'moderation.json';

// Debounce largo a propósito: en un directo activo `touch()` se llama una vez
// por mensaje. Las acciones de moderación no usan esto, hacen flush síncrono.
const DEBOUNCE_MS = 15000;
const MAX_DELAY_MS = 60000;
const SWEEP_MS = 15 * 60 * 1000;

const PLATFORMS = ['tiktok', 'twitch', 'youtube'];

function nowMs() {
  return Date.now();
}

function isActive(until) {
  return until === -1 || (until > 0 && until > nowMs());
}

function createModerationStore(opts = {}) {
  const {
    dataDir,
    log = () => {},
    maxViewers = 5000,
    purgeTarget = 4000,
  } = opts;

  const filePath = path.join(dataDir, FILE_NAME);
  const tmpPath = `${filePath}.tmp`;

  /** @type {Map<string, object>} clave `${platform}:${id}` → registro compacto */
  const viewers = new Map();

  let dirty = false;
  let debounceTimer = null;
  let maxDelayTimer = null;

  // ── Claves ────────────────────────────────────────────────────────────────

  function keyFor(platform, userId, nick) {
    const p = PLATFORMS.includes(platform) ? platform : 'tiktok';
    const id = userId ? String(userId).trim() : '';
    if (id) return `${p}:${id}`;
    // Sin id estable: identidad frágil por nombre. Nunca se fusiona con la
    // entrada por id del mismo nick — son usuarios distintos a efectos del
    // registro y mezclarlas es una fuente segura de castigos mal aplicados.
    const name = String(nick || 'anon').trim().toLowerCase();
    return `${p}:name:${name}`;
  }

  function parseKey(key) {
    const raw = String(key || '');
    const idx = raw.indexOf(':');
    if (idx <= 0) return null;
    const platform = raw.slice(0, idx);
    if (!PLATFORMS.includes(platform)) return null;
    let rest = raw.slice(idx + 1);
    let idKind = 'id';
    if (rest.startsWith('name:')) {
      idKind = 'name';
      rest = rest.slice(5);
    }
    if (!rest) return null;
    return { platform, id: rest, idKind };
  }

  // ── Persistencia ──────────────────────────────────────────────────────────

  function markDirty() {
    dirty = true;
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => flush(), DEBOUNCE_MS);
    if (debounceTimer.unref) debounceTimer.unref();
    // Techo duro: con tráfico constante el debounce se reprograma sin parar,
    // así que se garantiza una escritura al menos cada MAX_DELAY_MS.
    if (!maxDelayTimer) {
      maxDelayTimer = setTimeout(() => flush(), MAX_DELAY_MS);
      if (maxDelayTimer.unref) maxDelayTimer.unref();
    }
  }

  function clearTimers() {
    if (debounceTimer) clearTimeout(debounceTimer);
    if (maxDelayTimer) clearTimeout(maxDelayTimer);
    debounceTimer = null;
    maxDelayTimer = null;
  }

  // Siempre escribe de forma síncrona; lo único que decide el debounce es
  // *cuándo* se llega aquí. Las acciones de moderación llaman directo.
  function flush() {
    clearTimers();
    if (!dirty) return;
    if (viewers.size > maxViewers) purge();
    const payload = {
      version: SCHEMA_VERSION,
      savedAt: nowMs(),
      viewers: Object.fromEntries(viewers),
    };
    try {
      fs.writeFileSync(tmpPath, JSON.stringify(payload), 'utf8');
      fs.renameSync(tmpPath, filePath);
      dirty = false;
    } catch (err) {
      log('error', 'moderation', 'no se pudo guardar moderation.json', { error: err.message });
    }
  }

  function backupAndReset(suffix, reason) {
    try {
      fs.renameSync(filePath, `${filePath}.${suffix}`);
      log('error', 'moderation', 'moderation.json apartado', { reason, suffix });
    } catch (err) {
      log('error', 'moderation', 'no se pudo apartar moderation.json', { error: err.message });
    }
    viewers.clear();
  }

  // Nunca lanza: se invoca desde el require de server.js y un throw aquí
  // rompería el arranque de la app entera.
  function load() {
    viewers.clear();
    let raw;
    try {
      if (!fs.existsSync(filePath)) return;
      raw = fs.readFileSync(filePath, 'utf8');
    } catch (err) {
      log('warn', 'moderation', 'no se pudo leer moderation.json', { error: err.message });
      return;
    }
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      backupAndReset(`corrupt-${nowMs()}`, `json invalido: ${err.message}`);
      return;
    }
    const version = Number(parsed && parsed.version);
    if (version !== SCHEMA_VERSION) {
      // Solo puede ser una versión futura (escrita por una app más nueva).
      // Degradarla en silencio perdería castigos, así que se aparta el archivo.
      backupAndReset(`v${version || 0}.bak`, 'version desconocida');
      return;
    }
    const entries = parsed.viewers && typeof parsed.viewers === 'object' ? parsed.viewers : {};
    for (const [key, v] of Object.entries(entries)) {
      if (!v || typeof v !== 'object') continue;
      if (!parseKey(key)) continue;
      viewers.set(key, normalizeRecord(key, v));
    }
    purge();
    log('info', 'moderation', 'registro de espectadores cargado', { viewers: viewers.size });
  }

  function normalizeRecord(key, v) {
    const parsed = parseKey(key) || { platform: 'tiktok', id: '', idKind: 'name' };
    return {
      p: PLATFORMS.includes(v.p) ? v.p : parsed.platform,
      uid: typeof v.uid === 'string' ? v.uid : parsed.id,
      idk: v.idk === 'id' || v.idk === 'name' ? v.idk : parsed.idKind,
      nick: typeof v.nick === 'string' ? v.nick : parsed.id,
      first: Number(v.first) || 0,
      last: Number(v.last) || 0,
      msgs: Number(v.msgs) || 0,
      gifts: Number(v.gifts) || 0,
      likes: Number(v.likes) || 0,
      fol: !!v.fol,
      folAt: Number(v.folAt) || 0,
      wl: !!v.wl,
      mute: Number(v.mute) || 0,
      ban: Number(v.ban) || 0,
    };
  }

  // Descarta los inactivos más antiguos. Nunca toca seguidores, whitelisted ni
  // usuarios con un castigo vivo: son justo los que el streamer quiere que
  // sobrevivan a un directo multitudinario.
  function purge() {
    if (viewers.size <= maxViewers) return 0;
    const disposable = [];
    for (const [key, v] of viewers) {
      if (v.fol || v.wl || isActive(v.mute) || isActive(v.ban)) continue;
      disposable.push([key, v.last]);
    }
    const excess = viewers.size - purgeTarget;
    if (excess <= 0) return 0;
    if (disposable.length < excess) {
      log('warn', 'moderation', 'registro por encima del limite y sin candidatos suficientes', {
        viewers: viewers.size, disposable: disposable.length,
      });
    }
    disposable.sort((a, b) => a[1] - b[1]);
    const toRemove = disposable.slice(0, excess);
    for (const [key] of toRemove) viewers.delete(key);
    if (toRemove.length) {
      dirty = true;
      log('info', 'moderation', 'registro purgado', { removed: toRemove.length, viewers: viewers.size });
    }
    return toRemove.length;
  }

  // Normaliza a 0 los castigos ya vencidos. No cambia el comportamiento (la
  // lectura ya es perezosa), solo evita arrastrar timestamps muertos.
  function sweepExpired() {
    const t = nowMs();
    let cleaned = 0;
    for (const v of viewers.values()) {
      if (v.mute > 0 && v.mute <= t) { v.mute = 0; cleaned++; }
      if (v.ban > 0 && v.ban <= t) { v.ban = 0; cleaned++; }
    }
    if (cleaned) markDirty();
    return cleaned;
  }

  // ── Ingesta ───────────────────────────────────────────────────────────────

  function ensure({ platform, userId, nick, key }) {
    const k = key || keyFor(platform, userId, nick);
    let v = viewers.get(k);
    if (!v) {
      const parsed = parseKey(k);
      const t = nowMs();
      v = {
        p: parsed ? parsed.platform : 'tiktok',
        uid: userId ? String(userId) : (parsed ? parsed.id : ''),
        idk: parsed ? parsed.idKind : 'name',
        nick: nick ? String(nick) : (parsed ? parsed.id : ''),
        first: t,
        last: t,
        msgs: 0,
        gifts: 0,
        likes: 0,
        fol: false,
        folAt: 0,
        wl: false,
        mute: 0,
        ban: 0,
      };
      viewers.set(k, v);
    }
    return { key: k, viewer: v };
  }

  // No cuenta mensajes/regalos/likes por usuario a propósito — solo registra
  // que el espectador interactuó (para "última vez visto"), sin acumular
  // esos números por privacidad/simplicidad.
  function touch({ platform, userId, nick }) {
    const { viewer } = ensure({ platform, userId, nick });
    viewer.last = nowMs();
    if (nick) viewer.nick = String(nick);
    markDirty();
    return viewer;
  }

  function markFollower({ platform, userId, nick, manual = false }) {
    const { viewer } = ensure({ platform, userId, nick });
    const t = nowMs();
    viewer.last = t;
    if (nick) viewer.nick = String(nick);
    if (!viewer.fol) {
      viewer.fol = true;
      viewer.folAt = t;
    }
    if (manual) viewer.wl = true;
    markDirty();
    return viewer;
  }

  // ── Consulta ──────────────────────────────────────────────────────────────

  function get(key) {
    return viewers.get(key) || null;
  }

  function getEffective(key) {
    const v = viewers.get(key);
    if (!v) {
      return {
        exists: false,
        isFollower: false,
        isWhitelisted: false,
        isMuted: false,
        isBanned: false,
        muteUntil: 0,
        banUntil: 0,
      };
    }
    return {
      exists: true,
      isFollower: !!v.fol,
      isWhitelisted: !!v.wl,
      isMuted: isActive(v.mute),
      isBanned: isActive(v.ban),
      muteUntil: v.mute,
      banUntil: v.ban,
    };
  }

  function toDTO(key, v) {
    const viewer = v || viewers.get(key);
    if (!viewer) return null;
    return {
      key,
      platform: viewer.p,
      userId: viewer.uid,
      idKind: viewer.idk,
      nick: viewer.nick,
      firstSeen: viewer.first,
      lastSeen: viewer.last,
      messages: viewer.msgs,
      gifts: viewer.gifts,
      likes: viewer.likes,
      isFollower: !!viewer.fol,
      isWhitelisted: !!viewer.wl,
      followedAt: viewer.folAt,
      muteUntil: viewer.mute,
      banUntil: viewer.ban,
      isMuted: isActive(viewer.mute),
      isBanned: isActive(viewer.ban),
    };
  }

  const SORTS = {
    last: (v) => v.last,
    first: (v) => v.first,
    msgs: (v) => v.msgs,
    gifts: (v) => v.gifts,
    likes: (v) => v.likes,
    nick: (v) => String(v.nick || '').toLowerCase(),
  };

  function list(query = {}) {
    const {
      tab = 'all',
      platform = 'all',
      state = 'all',
      q = '',
      sort = 'last',
      dir = 'desc',
      limit = 100,
      offset = 0,
    } = query;

    const needle = String(q || '').trim().toLowerCase();
    const counts = { followers: 0, others: 0, muted: 0, banned: 0 };
    const matched = [];

    for (const [key, v] of viewers) {
      const follower = v.fol || v.wl;
      if (follower) counts.followers++; else counts.others++;
      if (isActive(v.mute)) counts.muted++;
      if (isActive(v.ban)) counts.banned++;

      if (tab === 'followers' && !follower) continue;
      if (tab === 'others' && follower) continue;
      if (platform !== 'all' && v.p !== platform) continue;
      if (state === 'muted' && !isActive(v.mute)) continue;
      if (state === 'banned' && !isActive(v.ban)) continue;
      if (state === 'punished' && !isActive(v.mute) && !isActive(v.ban)) continue;
      if (state === 'clean' && (isActive(v.mute) || isActive(v.ban))) continue;
      if (needle && !String(v.nick || '').toLowerCase().includes(needle)) continue;
      matched.push([key, v]);
    }

    const pick = SORTS[sort] || SORTS.last;
    const sign = dir === 'asc' ? 1 : -1;
    matched.sort((a, b) => {
      const va = pick(a[1]);
      const vb = pick(b[1]);
      if (va < vb) return -1 * sign;
      if (va > vb) return 1 * sign;
      return 0;
    });

    const start = Math.max(0, Number(offset) || 0);
    const end = start + Math.max(1, Number(limit) || 100);
    return {
      items: matched.slice(start, end).map(([key, v]) => toDTO(key, v)),
      total: matched.length,
      counts,
    };
  }

  function stats() {
    const out = {
      total: viewers.size,
      followers: 0,
      others: 0,
      muted: 0,
      banned: 0,
      byPlatform: { tiktok: 0, twitch: 0, youtube: 0 },
    };
    for (const v of viewers.values()) {
      if (v.fol || v.wl) out.followers++; else out.others++;
      if (isActive(v.mute)) out.muted++;
      if (isActive(v.ban)) out.banned++;
      if (out.byPlatform[v.p] !== undefined) out.byPlatform[v.p]++;
    }
    return out;
  }

  // ── Mutaciones ────────────────────────────────────────────────────────────
  // Todas devuelven el DTO ya expandido: quien llama solo tiene que responder
  // y difundirlo, sin conocer la forma compacta del registro.

  function mutate(target, fn) {
    const { key, viewer } = ensure(target);
    fn(viewer);
    markDirty();
    return toDTO(key, viewer);
  }

  function setMute(target, until) {
    return mutate(target, (v) => { v.mute = Number(until) || 0; });
  }

  function setBan(target, until) {
    return mutate(target, (v) => { v.ban = Number(until) || 0; });
  }

  function clearPunishments(target) {
    return mutate(target, (v) => { v.mute = 0; v.ban = 0; });
  }

  function setWhitelist(target, value) {
    return mutate(target, (v) => {
      v.wl = !!value;
      // Quitar la marca manual no debe borrar un follow real ya registrado,
      // pero sí sacarlo de la pestaña de seguidores si nunca lo fue.
      if (!value && v.folAt === 0) v.fol = false;
      if (value) v.fol = true;
    });
  }

  function remove(key) {
    const existed = viewers.delete(key);
    if (existed) markDirty();
    return existed;
  }

  function clearAll() {
    const n = viewers.size;
    viewers.clear();
    if (n) markDirty();
    return n;
  }

  function shutdown() {
    if (sweepTimer) clearInterval(sweepTimer);
    flush();
  }

  load();

  const sweepTimer = setInterval(() => sweepExpired(), SWEEP_MS);
  if (sweepTimer.unref) sweepTimer.unref();

  return {
    filePath,
    keyFor,
    parseKey,
    touch,
    markFollower,
    get,
    getEffective,
    toDTO,
    list,
    stats,
    setMute,
    setBan,
    clearPunishments,
    setWhitelist,
    remove,
    clearAll,
    load,
    flush,
    sweepExpired,
    shutdown,
    get size() { return viewers.size; },
  };
}

module.exports = { createModerationStore, SCHEMA_VERSION };
