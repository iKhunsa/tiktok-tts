'use strict';

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

module.exports = { parseYoutubeTarget, normalizeYoutubeInput };
