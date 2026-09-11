import { t } from '../../nucleo/i18n/i18n.js';
import { showToast } from '../../componentes/toast.js';

const PLATFORM_CHANNELS_KEY = 'tikliveTTS_platforms_v1';
export const PLATFORMS = ['tiktok', 'twitch', 'youtube', 'kick'];
const PLATFORM_LABELS = { tiktok: 'TikTok', twitch: 'Twitch', youtube: 'YouTube', kick: 'Kick' };
const PLATFORM_ICONS = { tiktok: 'icons/tiktok.svg', twitch: 'icons/sports_esports.svg', youtube: 'icons/tv.svg', kick: 'icons/kick.svg' };

function loadPlatformChannels() {
  try {
    const raw = JSON.parse(localStorage.getItem(PLATFORM_CHANNELS_KEY) || '{}');
    const normalized = normalizeSavedChannels(raw);
    if (JSON.stringify(raw) !== JSON.stringify(normalized)) savePlatformChannels(normalized);
    return normalized;
  } catch (e) {
    return normalizeSavedChannels({});
  }
}

function savePlatformChannels(data) {
  try { localStorage.setItem(PLATFORM_CHANNELS_KEY, JSON.stringify(normalizeSavedChannels(data))); } catch (e) { /* noop */ }
}

function normalizeSavedChannels(data = {}) {
  const output = { tiktok: [], twitch: [], youtube: [], kick: [] };
  PLATFORMS.forEach((platform) => {
    const value = data?.[platform];
    const items = Array.isArray(value) ? value : (value ? [{ channel: value }] : []);
    items.forEach((item) => {
      const entry = normalizeChannelEntry(platform, item?.channel ?? item);
      if (!entry) return;
      entry.autoConnect = item?.autoConnect ?? entry.autoConnect;
      entry.mode = item?.mode || entry.mode;
      if (!output[platform].some((existing) => existing.channel === entry.channel)) {
        output[platform].push(entry);
      }
    });
  });
  return output;
}

function normalizeChannelEntry(platform, value) {
  const raw = String(value || '').trim();
  if (!raw || !PLATFORMS.includes(platform)) return null;

  if (platform === 'tiktok') {
    const channel = raw.replace(/^@+/, '').split(/[/?#]/)[0].trim();
    return channel ? { channel, autoConnect: true, mode: 'savedTarget' } : null;
  }

  if (platform === 'twitch') {
    const channel = raw.replace(/^https?:\/\/(www\.)?twitch\.tv\//i, '').replace(/^[@#]+/, '').split(/[/?#]/)[0].trim().toLowerCase();
    return channel ? { channel, autoConnect: true, mode: 'savedTarget' } : null;
  }

  if (platform === 'kick') {
    const channel = raw.replace(/^https?:\/\/(www\.)?kick\.com\//i, '').replace(/^[@#]+/, '').split(/[/?#]/)[0].trim().toLowerCase();
    return channel ? { channel, autoConnect: true, mode: 'savedTarget' } : null;
  }

  return normalizeYoutubeEntry(raw);
}

function normalizeYoutubeEntry(raw) {
  const videoEntry = (channel) => (channel ? { channel, autoConnect: false, mode: 'temporaryLive' } : null);
  const savedEntry = (channel) => (channel ? { channel, autoConnect: true, mode: 'savedTarget' } : null);

  try {
    const candidate = /^https?:\/\//i.test(raw) ? raw : (/youtube\.com|youtu\.be/i.test(raw) ? 'https://' + raw : raw);
    const url = new URL(candidate);
    const host = url.hostname.replace(/^www\./, '').toLowerCase();
    if (host === 'youtu.be') return videoEntry(url.pathname.split('/').filter(Boolean)[0]);
    if (host.endsWith('youtube.com')) {
      const parts = url.pathname.split('/').filter(Boolean);
      if (url.pathname === '/watch') return videoEntry(url.searchParams.get('v'));
      if (parts[0] === 'live') return videoEntry(parts[1]);
      if (parts[0] === 'channel') return savedEntry(parts[1]);
      if (parts[0]?.startsWith('@')) return savedEntry(parts[0]);
      if (parts[0] === 'c' || parts[0] === 'user') return savedEntry(parts[1] ? '@' + parts[1].replace(/^@+/, '') : '');
    }
  } catch (e) { /* no es URL valida, cae a los patrones de abajo */ }

  if (/^UC[\w-]{20,}$/i.test(raw)) return savedEntry(raw);
  if (/^@[\w.-]+$/i.test(raw)) return savedEntry(raw);
  if (/^[\w-]{11}$/.test(raw)) return videoEntry(raw);
  return savedEntry('@' + raw.replace(/^@+/, '').split(/[/?#]/)[0]);
}

function upsertSavedChannel(platform, entry) {
  if (!entry) return;
  const saved = loadPlatformChannels();
  saved[platform] = saved[platform].filter((item) => item.channel !== entry.channel);
  saved[platform].push(entry);
  savePlatformChannels(saved);
}

function removeSavedChannel(platform, channel) {
  const saved = loadPlatformChannels();
  const normalized = normalizeChannelEntry(platform, channel);
  const target = normalized?.channel || channel;
  saved[platform] = saved[platform].filter((item) => item.channel !== target);
  savePlatformChannels(saved);
}

function formatChannelDisplay(platform, channel) {
  if (platform === 'youtube' && /^[\w-]{11}$/.test(channel)) return channel;
  return '@' + String(channel || '').replace(/^@+/, '');
}

function stateLabel(state) {
  if (state === 'connected') return t('status.connected');
  if (state === 'manual') return t('conn.stateManual');
  if (state === 'error') return t('conn.stateError');
  return t('conn.stateSaved');
}

let selectedAddPlatform = 'tiktok';
let settingsChannelsRenderSeq = 0;

export function toggleAddChannelForm() {
  const form = document.getElementById('add-channel-form');
  if (form) {
    const showing = form.style.display === 'flex';
    form.style.display = showing ? 'none' : 'flex';
    if (!showing) {
      const input = document.getElementById('add-channel-input');
      if (input) setTimeout(() => input.focus(), 50);
    }
  }
}

export function selectAddPlatform(platform) {
  selectedAddPlatform = platform;
  PLATFORMS.forEach((p) => {
    const btn = document.getElementById(`seg-${p}`);
    if (btn) btn.classList.toggle('active', p === platform);
  });
  const placeholders = { tiktok: '@usuario', twitch: 'nombre_del_canal', youtube: '@canal, Channel ID o link live', kick: 'nombre_del_canal' };
  const input = document.getElementById('add-channel-input');
  if (input) { input.placeholder = placeholders[platform] || '@usuario'; input.focus(); }
  const hint = document.getElementById('youtube-channel-hint');
  if (hint) hint.style.display = platform === 'youtube' ? 'block' : 'none';
}

export function addChannelFromSettings() {
  const input = document.getElementById('add-channel-input');
  const channel = (input?.value || '').trim();
  if (!channel) { showToast(t('toast.writeChannel')); return; }

  const plannedEntry = normalizeChannelEntry(selectedAddPlatform, channel);
  if (!plannedEntry) { showToast(t('toast.invalidChannel')); return; }

  // Solo guarda/vincula el canal — la conexion real ocurre con "Conectar todo" en Chat.
  upsertSavedChannel(selectedAddPlatform, plannedEntry);

  if (selectedAddPlatform === 'youtube') {
    showToast(plannedEntry.autoConnect ? t('toast.youtubeAutoSaved') : t('toast.youtubeTmpSaved'));
  } else {
    showToast(t('toast.channelSaved').replace('{platform}', PLATFORM_LABELS[selectedAddPlatform]));
  }
  input.value = '';
  toggleAddChannelForm();
  renderSettingsChannels();
}

async function removeChannel(platform, channel) {
  try {
    await fetch('/api/platforms/disconnect', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ platform, channel }),
    });
    removeSavedChannel(platform, channel);
    renderSettingsChannels();
    showToast(t('toast.platformDisconnected').replace('{platform}', PLATFORM_LABELS[platform]));
  } catch (e) {
    showToast(t('toast.channelDisconnectError').replace('{platform}', platform));
  }
}

async function connectSavedChannels() {
  const saved = loadPlatformChannels();
  const targets = [];
  let manualCount = 0;

  PLATFORMS.forEach((platform) => {
    saved[platform].forEach((entry) => {
      if (entry.autoConnect) targets.push({ platform, entry });
      else manualCount++;
    });
  });

  if (targets.length === 0) {
    showToast(manualCount ? t('conn.onlyManualChannels') : t('conn.noSavedChannels'));
    return;
  }

  const chatBtn = document.getElementById('btn-connect-all-chat');
  if (chatBtn) { chatBtn.disabled = true; chatBtn.textContent = t('conn.connecting'); }

  let connected = 0;
  let failed = 0;
  for (const { platform, entry } of targets) {
    try {
      const res = await fetch('/api/platforms/connect', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ platform, channel: entry.channel }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        const connectedEntry = normalizeChannelEntry(platform, d.channel || entry.channel) || entry;
        connectedEntry.autoConnect = entry.autoConnect;
        connectedEntry.mode = entry.mode;
        upsertSavedChannel(platform, connectedEntry);
        connected++;
      } else {
        failed++;
      }
    } catch (e) {
      failed++;
    }
  }

  if (chatBtn) { chatBtn.disabled = false; chatBtn.textContent = t('btn.connectAll'); }
  renderSettingsChannels();
  const parts = [`${connected} conectados`];
  if (failed) parts.push(`${failed} fallidos`);
  if (manualCount) parts.push(`${manualCount} manual`);
  showToast(t('conn.connectAllMsg', { parts: parts.join(', ') }));
}

export async function toggleConnectAllChat() {
  const chatBtn = document.getElementById('btn-connect-all-chat');
  if (chatBtn && chatBtn.classList.contains('channels-connected')) {
    chatBtn.disabled = true;
    const prevText = chatBtn.textContent;
    chatBtn.textContent = t('conn.connecting');
    let channels = { tiktok: [], twitch: [], youtube: [], kick: [] };
    try {
      const res = await fetch('/api/channels');
      if (res.ok) channels = await res.json();
    } catch (e) { /* noop */ }
    const active = [];
    PLATFORMS.forEach((platform) => {
      (channels[platform] || []).forEach((ch) => {
        const normalized = normalizeChannelEntry(platform, ch)?.channel;
        if (normalized) active.push({ platform, channel: normalized });
      });
    });
    for (const { platform, channel } of active) {
      try {
        await fetch('/api/platforms/disconnect', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ platform, channel }),
        });
      } catch (e) { /* noop */ }
    }
    chatBtn.disabled = false;
    chatBtn.textContent = prevText;
    renderSettingsChannels();
    showToast(t('toast.allChannelsDisconnected'));
  } else {
    connectSavedChannels();
  }
}

async function updateChatConnectAllState(preloadedChannels) {
  const chatBtn = document.getElementById('btn-connect-all-chat');
  if (!chatBtn) return;
  let channels = preloadedChannels;
  if (!channels) {
    channels = { tiktok: [], twitch: [], youtube: [], kick: [] };
    try {
      const res = await fetch('/api/channels');
      if (res.ok) channels = await res.json();
    } catch (e) { /* noop */ }
  }
  const activeCount = PLATFORMS.reduce((sum, platform) => sum + (channels[platform] || []).length, 0);
  if (activeCount > 0) {
    chatBtn.classList.add('channels-connected');
    chatBtn.title = `${activeCount} canal(es) conectado(s) — clic para desconectar`;
  } else {
    chatBtn.classList.remove('channels-connected');
    chatBtn.title = 'Sin canales conectados — clic para conectar todo';
  }
}

export async function renderSettingsChannels() {
  const renderSeq = ++settingsChannelsRenderSeq;
  const el = document.getElementById('settings-channels-list');
  if (!el) return;

  let channels = { tiktok: [], twitch: [], youtube: [], kick: [] };
  try {
    const res = await fetch('/api/channels');
    if (res.ok) channels = await res.json();
  } catch (e) { /* noop */ }
  if (renderSeq !== settingsChannelsRenderSeq) return;
  updateChatConnectAllState(channels);

  const saved = loadPlatformChannels();
  const byKey = new Map();
  const stateRank = { connected: 3, saved: 2, manual: 1, error: 0 };
  const addChannelChip = (platform, ch, state) => {
    const normalized = normalizeChannelEntry(platform, ch)?.channel;
    if (!normalized) return;
    const key = `${platform}:${normalized}`;
    const existing = byKey.get(key);
    if (!existing || stateRank[state] > stateRank[existing.state]) {
      byKey.set(key, { platform, ch: normalized, state });
    }
  };

  PLATFORMS.forEach((platform) => {
    const active = new Set((channels[platform] || []).map((ch) => normalizeChannelEntry(platform, ch)?.channel).filter(Boolean));
    active.forEach((ch) => addChannelChip(platform, ch, 'connected'));
    (saved[platform] || []).forEach((entry) => {
      const savedChannel = normalizeChannelEntry(platform, entry.channel)?.channel;
      if (savedChannel && !active.has(savedChannel)) addChannelChip(platform, savedChannel, entry.autoConnect ? 'saved' : 'manual');
    });
  });

  const all = Array.from(byKey.values());
  el.innerHTML = '';
  if (all.length === 0) {
    el.innerHTML = `<div style="font-size:12px;color:var(--text-muted);">${t('conn.noSavedChannels')}</div>`;
    return;
  }
  all.forEach(({ platform, ch, state }) => {
    const tag = document.createElement('span');
    tag.className = `channel-chip ${platform}${state === 'manual' ? ' needs-action' : ''}`;
    const icon = document.createElement('img');
    icon.src = PLATFORM_ICONS[platform];
    icon.alt = '';
    icon.style.cssText = 'width:12px;height:12px;opacity:0.7;';
    const platformLabel = document.createElement('span');
    platformLabel.className = 'channel-platform-label';
    platformLabel.textContent = PLATFORM_LABELS[platform] + ' ·';
    const label = document.createElement('span');
    label.style.cssText = 'font-family:monospace;font-size:12px;';
    label.textContent = formatChannelDisplay(platform, ch);
    const status = document.createElement('span');
    status.className = `channel-state ${state === 'connected' ? 'connected' : state === 'manual' ? 'manual' : ''}`;
    status.textContent = stateLabel(state);
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.title = `Eliminar ${PLATFORM_LABELS[platform]} ${formatChannelDisplay(platform, ch)}`;
    removeBtn.textContent = 'x';
    removeBtn.onclick = () => removeChannel(platform, ch);
    tag.append(icon, platformLabel, label, status, removeBtn);
    el.appendChild(tag);
  });
}
