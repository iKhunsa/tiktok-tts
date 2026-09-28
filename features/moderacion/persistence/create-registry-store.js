'use strict';

const path = require('path');
const { viewerKey } = require('@tiklivetts/chat-guard');
const { flushRegistry } = require('./flush-registry');
const { listViewers } = require('./list-viewers');
const { loadRegistry } = require('./load-registry');
const { scheduleFlush } = require('./schedule-flush');
const { toDto } = require('./to-dto');
const { viewerStats } = require('./viewer-stats');

function createRegistryStore({ dataDir, logger }) {
  const state = createState(dataDir, logger);
  loadRegistry(state);
  if (state.dirty) flush();

  function flush() {
    return flushRegistry(state);
  }

  function modify(target, change) {
    const key = targetKey(target);
    change(key);
    scheduleFlush(state, flush);
    return toDto(state.registry, key);
  }

  function touch(target) {
    return modify(target, (key) => state.registry.touch(key, { displayName: target.nick || '' }));
  }

  function markFollower(target) {
    return modify(target, (key) => state.registry.follow(key));
  }

  function setMute(target, until) {
    return modify(target, (key) => state.registry.mute(key, until));
  }

  function setBan(target, until) {
    return modify(target, (key) => state.registry.ban(key, until));
  }

  function clearPunishments(target) {
    return modify(target, (key) => {
      state.registry.unmute(key);
      state.registry.unban(key);
    });
  }

  function setWhitelist(target, value) {
    return modify(target, (key) => {
      if (value) state.registry.whitelist(key);
      else state.registry.unwhitelist(key);
    });
  }

  function remove(key) {
    const exists = state.registry.statusOf(key).firstSeenAt > 0;
    if (exists) {
      state.registry.remove(key);
      scheduleFlush(state, flush);
    }
    return exists;
  }

  function clearAll() {
    const count = state.registry.list().length;
    if (count) {
      state.registry.clear();
      scheduleFlush(state, flush);
    }
    return count;
  }

  function switchDataDir(nextDataDir) {
    flush();
    Object.assign(state, createState(nextDataDir, logger));
    loadRegistry(state);
    if (state.dirty) flush();
  }

  return {
    get registry() { return state.registry; },
    keyFor: keyFor,
    parseKey,
    touch,
    markFollower,
    setMute,
    setBan,
    clearPunishments,
    setWhitelist,
    remove,
    clearAll,
    list: (query) => listViewers(state.registry.list().map((viewer) => toDto(state.registry, viewer.key)), query),
    stats: () => viewerStats(state.registry.list().map((viewer) => toDto(state.registry, viewer.key))),
    flush,
    switchDataDir,
    shutdown: flush,
    toDTO: (key) => toDto(state.registry, key),
  };
}

function createState(dataDir, logger) {
  return { dataDir, filePath: path.join(dataDir, 'moderation.json'), logger, registry: null, dirty: false, debounceTimer: null, maximumTimer: null };
}

function keyFor(platform, userId, nick) {
  return viewerKey({ platform, id: userId, handle: nick });
}

function targetKey(target) {
  return target.key || keyFor(target.platform, target.userId, target.nick);
}

function parseKey(key) {
  const match = /^(tiktok|twitch|youtube|kick):(id|name):(.+)$/.exec(String(key || ''));
  return match ? { platform: match[1], idKind: match[2], id: match[3] } : null;
}

module.exports = { createRegistryStore };
