'use strict';

const path = require('path');
const express = require('express');
const { RESOURCE_BASE } = require('../../core/paths');
const { createOverlayState } = require('./state/overlay-state');
const { resetOverlayState } = require('./state/reset');
const { setFollowerBaseForChannel } = require('./state/set-follower-base');
const { recomputeFollowerBase } = require('./state/recompute-follower-base');
const { extractFollowerCount } = require('./state/extract-follower-count');
const { startFollowerRefresh, stopFollowerRefresh } = require('./state/follower-refresh-timer');
const { computeGiftUsd } = require('./compute-gift-usd');
const { cleanNick } = require('./clean-nick');
const mcpRegistry = require('../../core/contracts/mcp-registry');

const { overlayStats } = require('./routes/overlay-stats');
const { giftsList } = require('./routes/gifts-list');
const { uploadBg } = require('./routes/upload-bg');
const { deleteBg } = require('./routes/delete-bg');
const { testGift } = require('./routes/test-gift');
const { testFollow } = require('./routes/test-follow');
const { testShare } = require('./routes/test-share');
const { testSub } = require('./routes/test-sub');
const { testCheer } = require('./routes/test-cheer');
const { testRaid } = require('./routes/test-raid');
const { testLikes } = require('./routes/test-likes');

const LIKE_DEBOUNCE_FALLBACK_MS = 1500;

function getConfigSnapshot(bus) {
  let snapshot = null;
  bus.emit('config:get', (config) => { snapshot = config; });
  return snapshot || {};
}

module.exports = {
  name: 'overlay',

  register({ app, bus, logger }) {
    const state = createOverlayState();
    state.likePendingTimers = new Map();
    const deps = { state, bus, logger };

    app.use('/gifts', express.static(path.join(RESOURCE_BASE, 'gifts')));
    app.use('/uploads', express.static(require('./routes/upload-bg').UPLOADS_DIR));

    // ── Consumo puro de eventos de /canales y /chat ──────────────────────────
    bus.on('canal:gift', (payload) => {
      if (payload.platform !== 'tiktok') return; // valorizacion en USD solo aplica a TikTok
      const data = payload.raw || {};
      const user = cleanNick(data.nickname, data.uniqueId);
      const repeatCount = data.repeatCount || 1;
      const { usdValue } = computeGiftUsd(logger, { giftName: data.giftName, repeatCount, diamondCount: data.diamondCount || 0 });
      state.credits.donors.push({ user, giftName: data.giftName, count: repeatCount, ts: Date.now() });
      bus.emit('ws:broadcast', {
        type: 'gift', user, giftName: data.giftName, giftId: data.giftId,
        giftPictureUrl: data.giftPictureUrl || null, repeatCount, usdValue, timestamp: Date.now(),
      });
    }, 'overlay');

    bus.on('canal:follow', (payload) => {
      const user = cleanNick(payload.nick, payload.userId);
      state.credits.followers.push({ user, ts: Date.now() });
      bus.emit('ws:broadcast', { type: 'follow', platform: payload.platform, user, userId: payload.userId || null, timestamp: Date.now() });
      if (payload.platform === 'tiktok') state.followCount += 1;
    }, 'overlay');

    bus.on('canal:like', (payload) => {
      const user = cleanNick(payload.nick, payload.userId);
      const config = getConfigSnapshot(bus);
      const debounceMs = config.LIKE_DEBOUNCE_MS || LIKE_DEBOUNCE_FALLBACK_MS;

      if (state.likePendingTimers.has(user)) {
        clearTimeout(state.likePendingTimers.get(user).timer);
      } else {
        state.likePendingTimers.set(user, { timer: null, count: 0 });
      }
      const pending = state.likePendingTimers.get(user);
      pending.count += (payload.likeCount || 1);
      pending.timer = setTimeout(() => {
        const likeCount = pending.count;
        state.likePendingTimers.delete(user);
        bus.emit('ws:broadcast', { type: 'like', user, likeCount, timestamp: Date.now() });
        const existing = state.topLikers.get(user) || { user, totalLikes: 0 };
        existing.totalLikes += likeCount;
        state.topLikers.set(user, existing);
      }, debounceMs);
    }, 'overlay');

    bus.on('canal:evento-especial', (payload) => {
      const { platform, channel, kind, raw, userId, nick } = payload;
      if (kind === 'share') {
        const user = cleanNick(nick, userId);
        state.sharers.push({ user, ts: Date.now() });
        state.credits.sharers.push({ user, ts: Date.now() });
        bus.emit('ws:broadcast', { type: 'share', platform, user, timestamp: Date.now() });
      } else if (kind === 'join') {
        bus.emit('ws:broadcast', { type: 'join', platform, user: cleanNick(nick, userId), userId: userId || null, timestamp: Date.now() });
      } else if (kind && kind.startsWith('sub-')) {
        const subType = { 'sub-nueva': 'new', 'sub-resub': 'resub', 'sub-regalo': 'gift', 'sub-misterio': 'mysterygift', 'sub-upgrade': 'upgrade' }[kind] || 'new';
        const { username, message, ...rest } = raw || {};
        bus.emit('ws:broadcast', {
          type: 'sub', platform, subType, user: cleanNick(username, null), channel,
          message: message || '', timestamp: Date.now(), ...rest,
        });
      } else if (kind === 'cheer') {
        bus.emit('ws:broadcast', { type: 'cheer', platform, user: cleanNick(raw.username, null), bits: raw.bits || 0, message: raw.message || '', channel, timestamp: Date.now() });
      } else if (kind === 'raid') {
        bus.emit('ws:broadcast', { type: 'raid', platform, user: cleanNick(raw.username, null), viewers: raw.viewers || 0, channel, timestamp: Date.now() });
      } else if (kind === 'superchat') {
        const authorName = raw.author && raw.author.name;
        bus.emit('ws:broadcast', {
          type: 'superchat', platform, user: cleanNick(authorName, null),
          amount: raw.amount || '', color: raw.color || '', sticker: (raw.sticker && raw.sticker.url) || null,
          channel, timestamp: Date.now(),
        });
      }
    }, 'overlay');

    // ── Base de followers (multi-canal TikTok) ───────────────────────────────
    bus.on('canal:estado', (payload) => {
      if (payload.platform !== 'tiktok') return;

      if (payload.state === 'conectando' && state.activeTiktokChannels.size === 0) {
        resetOverlayState(state);
      }

      if (payload.state === 'conectado' || payload.state === 'followers-refrescado') {
        if (payload.channel) state.activeTiktokChannels.add(payload.channel);
        const count = extractFollowerCount(payload.roomInfo);
        if (count > 0) setFollowerBaseForChannel(deps, payload.channel, count);
        if (payload.state === 'conectado') startFollowerRefresh(deps);
      }

      if (payload.state === 'desconectado' || payload.state === 'sin-canales') {
        if (payload.channel) state.activeTiktokChannels.delete(payload.channel);
        recomputeFollowerBase(deps);
        if (state.activeTiktokChannels.size === 0) {
          stopFollowerRefresh(deps);
          // Migracion de clearLikePendingTimers (backend-viejo/server.js:599) —
          // sin esto, timers de debounce de likes pendientes de un canal ya
          // desconectado podian disparar un broadcast de likes fantasma.
          for (const pending of state.likePendingTimers.values()) {
            if (pending && pending.timer) clearTimeout(pending.timer);
          }
          state.likePendingTimers.clear();
        }
      }
    }, 'overlay');

    // ── Rutas ─────────────────────────────────────────────────────────────
    app.get('/api/overlay-stats', overlayStats(state));
    app.get('/api/gifts-list', giftsList(logger));
    app.post('/api/upload-bg', uploadBg(logger));
    app.delete('/api/upload-bg', deleteBg(logger));
    app.post('/api/test/gift', testGift(deps));
    app.post('/api/test/follow', testFollow(deps));
    app.post('/api/test/share', testShare(deps));
    app.post('/api/test/sub', testSub(deps));
    app.post('/api/test/cheer', testCheer(deps));
    app.post('/api/test/raid', testRaid(deps));
    app.post('/api/test/likes', testLikes(deps));

    // ── MCP ──────────────────────────────────────────────────────────────
    const slice = () => {
      const topLikers = [...state.topLikers.values()].sort((a, b) => b.totalLikes - a.totalLikes).slice(0, 10);
      return {
        overlay: {
          followCount: state.followCount,
          baseFollowerCount: state.baseFollowerCount,
          topLikers,
          recentSharers: state.sharers.slice(-10).map((s) => s.user),
          recentDonors: state.credits.donors.slice(-10),
        },
      };
    };
    mcpRegistry.registerStateProvider(slice, 'overlay');
    // Idiom alternativo (demo): responder al pull por bus mcp:state.
    bus.on('mcp:state', (respond) => { if (typeof respond === 'function') respond(slice()); }, 'overlay');

    mcpRegistry.registerTool({
      name: 'overlay_stats', domain: 'overlay', readOnly: true,
      title: 'Overlay stats',
      description: 'Follower count, top likers, recent sharers, gift/donor credits (session).',
      inputSchema: { type: 'object', properties: {} },
      handler: () => slice().overlay,
    });

    return { rutas: 9, listeners: 6 };
  },
};
