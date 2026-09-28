'use strict';

const fs = require('fs');
const path = require('path');
const { atomicWriteFileSync } = require('../../../core/atomic-write');
const { createViewerRegistry, migrateLegacyModeration, viewerKey } = require('@tiklivetts/chat-guard');

const DEBOUNCE_MS = 15000;
const MAX_DELAY_MS = 60000;

function createRegistryStore({ dataDir, logger }) {
  let registry;
  let dirty = false;
  let debounce;
  let maximum;
  let directory = dataDir;
  load();

  function filePath() { return path.join(directory, 'moderation.json'); }
  function keyFor(platform, userId, nick) { return viewerKey({ platform, id: userId, handle: nick }); }
  function touch(target) { registry.touch(keyFor(target.platform, target.userId, target.nick), { displayName: target.nick || '' }); markDirty(); return dto(keyFor(target.platform, target.userId, target.nick)); }
  function markFollower(target) { registry.follow(keyFor(target.platform, target.userId, target.nick)); markDirty(); return dto(keyFor(target.platform, target.userId, target.nick)); }
  function setMute(target, until) { registry.mute(keyForTarget(target), until); markDirty(); return dto(keyForTarget(target)); }
  function setBan(target, until) { registry.ban(keyForTarget(target), until); markDirty(); return dto(keyForTarget(target)); }
  function clearPunishments(target) { const key = keyForTarget(target); registry.unmute(key); registry.unban(key); markDirty(); return dto(key); }
  function setWhitelist(target, value) { const key = keyForTarget(target); if (value) registry.whitelist(key); markDirty(); return dto(key); }
  function remove(key) { const exists = registry.statusOf(key).firstSeenAt > 0; registry.remove(key); if (exists) markDirty(); return exists; }
  function clearAll() { const count = registry.list().length; registry.clear(); if (count) markDirty(); return count; }
  function parseKey(key) { const match = /^(tiktok|twitch|youtube|kick):(id|name):(.+)$/.exec(String(key || '')); return match ? { platform: match[1], idKind: match[2], id: match[3] } : null; }
  function dto(key) { const v = registry.statusOf(key); return { key, platform: v.platform, userId: v.idKind === 'id' ? v.subjectId : null, idKind: v.idKind, nick: v.displayName || (v.idKind === 'name' ? v.subjectId : ''), firstSeen: v.firstSeenAt, lastSeen: v.lastSeenAt, isFollower: v.isFollower, isWhitelisted: v.isWhitelisted, followedAt: v.followedAt || null, muteUntil: v.mutedUntil, banUntil: v.bannedUntil, isMuted: v.mutedUntil !== null, isBanned: v.bannedUntil !== null }; }
  function list(query = {}) { const rows = registry.list().map((v) => dto(v.key)); const filtered = rows.filter((v) => (query.tab !== 'followers' || v.isFollower || v.isWhitelisted) && (query.tab !== 'others' || (!v.isFollower && !v.isWhitelisted)) && (query.platform === 'all' || !query.platform || v.platform === query.platform) && (!query.q || v.nick.toLowerCase().includes(String(query.q).toLowerCase()))); return { items: filtered.slice(query.offset || 0, (query.offset || 0) + (query.limit || 100)), total: filtered.length, counts: counts(rows) }; }
  function stats() { const rows = registry.list().map((v) => dto(v.key)); const c = counts(rows); return { total: rows.length, ...c, byPlatform: Object.fromEntries(['tiktok', 'twitch', 'youtube', 'kick'].map((p) => [p, rows.filter((v) => v.platform === p).length])) }; }
  function counts(rows) { return { followers: rows.filter((v) => v.isFollower || v.isWhitelisted).length, others: rows.filter((v) => !v.isFollower && !v.isWhitelisted).length, muted: rows.filter((v) => v.isMuted).length, banned: rows.filter((v) => v.isBanned).length }; }
  function keyForTarget(target) { return target.key || keyFor(target.platform, target.userId, target.nick); }
  function markDirty() { dirty = true; clearTimeout(debounce); debounce = setTimeout(flush, DEBOUNCE_MS); if (debounce.unref) debounce.unref(); if (!maximum) { maximum = setTimeout(flush, MAX_DELAY_MS); if (maximum.unref) maximum.unref(); } }
  function flush() { clearTimeout(debounce); clearTimeout(maximum); debounce = maximum = null; if (!dirty) return true; try { atomicWriteFileSync(filePath(), JSON.stringify(registry.toJSON())); dirty = false; return true; } catch (error) { logger.log('error', 'moderacion', 'moderacion/persistence/create-registry-store.js#flush', 'moderacion.store.guardado_fallido', 'No se pudo guardar moderation.json', { error: error.message }); return false; } }
  function load() { registry = createViewerRegistry({ capacity: 5000 }); if (!fs.existsSync(filePath())) return; try { const parsed = JSON.parse(fs.readFileSync(filePath(), 'utf8')); if (parsed.version === 2) registry = createViewerRegistry.fromJSON(parsed, { capacity: 5000 }); else { const migrated = migrateLegacyModeration(parsed); fs.renameSync(filePath(), path.join(directory, 'moderation.v1.json')); registry = createViewerRegistry.fromJSON(migrated, { capacity: 5000 }); dirty = true; flush(); } } catch (error) { try { fs.renameSync(filePath(), `${filePath()}.corrupt-${Date.now()}`); } catch { /* best effort */ } logger.log('warn', 'moderacion', 'moderacion/persistence/create-registry-store.js#load', 'moderacion.store.carga_fallida', 'moderation.json invalido; se inicia vacio', { error: error.message }); } }
  function switchDataDir(next) { flush(); directory = next; dirty = false; load(); }
  return { get registry() { return registry; }, keyFor, parseKey, touch, markFollower, setMute, setBan, clearPunishments, setWhitelist, remove, clearAll, list, stats, flush, switchDataDir, shutdown: flush, toDTO: dto };
}

module.exports = { createRegistryStore };
