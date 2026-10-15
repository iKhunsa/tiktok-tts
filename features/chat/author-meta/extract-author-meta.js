'use strict';

const { tiktokMeta } = require('./tiktok-meta');
const { twitchMeta } = require('./twitch-meta');
const { youtubeMeta } = require('./youtube-meta');
const { kickMeta } = require('./kick-meta');

const EXTRACTOR_BY_PLATFORM = {
  tiktok: tiktokMeta,
  twitch: twitchMeta,
  youtube: youtubeMeta,
  kick: kickMeta,
};

const NO_META = Object.freeze({ avatar: '', isModerator: false, isSubscriber: false });

// Avatar y roles que chat-guard no transporta: se leen del `raw` de cada
// plataforma. Nunca lanza ni devuelve null: un mensaje sin metadatos no debe
// perder su render por un campo decorativo.
function extractAuthorMeta(platform, raw) {
  const extract = EXTRACTOR_BY_PLATFORM[platform];
  if (!extract || !raw) return NO_META;
  try {
    return extract(raw);
  } catch {
    return NO_META;
  }
}

module.exports = { extractAuthorMeta };
